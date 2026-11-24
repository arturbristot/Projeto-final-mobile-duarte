import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Botao } from '../../components/Botao';
import { Carregando } from '../../components/Carregando';
import { ListaVazia } from '../../components/ListaVazia';
import { Opcoes } from '../../components/Opcoes';
import { useAuth, useUid } from '../../contexts/AuthContext';
import { useColecao } from '../../hooks/useColecao';
import { buscarOcupadosDoDia, solicitarAgendamento } from '../../services/agendamentos';
import { avisarErro, gravar, mensagemErroFirestore, perguntar } from '../../services/operacao';
import { listarBarbearias } from '../../services/perfil';
import { observarServicos } from '../../services/servicos';
import { colors, fonts, radius, spacing } from '../../theme';
import { formatarDataLonga, formatarHora, formatarMoeda, mesmoDia } from '../../utils/format';
import { DIAS_SEMANA, gerarHorariosLivres, proximosDiasAbertos } from '../../utils/horarios';

const DIAS_A_FRENTE = 14;

export default function AgendarScreen({ navigation }) {
  const uid = useUid();
  const { perfil } = useAuth();
  const [barbearias, setBarbearias] = useState(null);
  const [erroBarbearias, setErroBarbearias] = useState(null);
  const [barbeariaId, setBarbeariaId] = useState(null);

  const carregarBarbearias = useCallback(() => {
    listarBarbearias()
      .then((lista) => {
        setBarbearias(lista);
        setBarbeariaId((atual) => atual ?? lista[0]?.id ?? null);
      })
      .catch((e) => setErroBarbearias(mensagemErroFirestore(e)));
  }, []);

  useEffect(() => {
    carregarBarbearias();
  }, [carregarBarbearias]);

  if (erroBarbearias) {
    return (
      <View style={styles.centro}>
        <Text style={styles.textoMudo}>{erroBarbearias}</Text>
        <Botao
          titulo="Tentar de novo"
          variante="secundario"
          onPress={() => {
            setErroBarbearias(null);
            carregarBarbearias();
          }}
        />
      </View>
    );
  }
  if (!barbearias) return <Carregando />;
  if (!barbearias.length) {
    return (
      <ListaVazia
        icone="storefront-outline"
        titulo="Nenhuma barbearia disponível"
        descricao="Ainda não há barbearias cadastradas no app."
      />
    );
  }

  const barbearia = barbearias.find((b) => b.id === barbeariaId) ?? barbearias[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      {barbearias.length > 1 && (
        <Opcoes
          rotulo="Barbearia"
          opcoes={barbearias.map((b) => ({ valor: b.id, rotulo: b.nome }))}
          valor={barbearia.id}
          onChange={setBarbeariaId}
        />
      )}
      <CartaoBarbearia barbearia={barbearia} />
      {/* A key reinicia as escolhas ao trocar de barbearia. */}
      <Marcacao
        key={barbearia.id}
        barbearia={barbearia}
        cliente={{ uid, nome: perfil.nome, telefone: perfil.telefone }}
        aoMarcar={() => navigation.navigate('MeusHorarios')}
      />
    </ScrollView>
  );
}

function CartaoBarbearia({ barbearia }) {
  const { funcionamento } = barbearia;
  const temLocal = barbearia.latitude !== undefined && barbearia.longitude !== undefined;

  function comoChegar() {
    const { latitude, longitude } = barbearia;
    const rotulo = encodeURIComponent(barbearia.nome);
    const url = Platform.select({
      ios: `maps:0,0?q=${rotulo}@${latitude},${longitude}`,
      default: `geo:0,0?q=${latitude},${longitude}(${rotulo})`,
    });
    Linking.openURL(url).catch(() => Alert.alert('Erro', 'Nenhum app de mapas encontrado.'));
  }

  return (
    <View style={styles.barbearia}>
      <Text style={styles.nomeBarbearia}>{barbearia.nome}</Text>
      {barbearia.endereco ? <Text style={styles.textoMudo}>{barbearia.endereco}</Text> : null}
      <Text style={styles.textoMudo}>
        {funcionamento.dias.map((d) => DIAS_SEMANA[d]).join(', ')} · {funcionamento.abertura} às{' '}
        {funcionamento.fechamento}
      </Text>
      {temLocal && (
        <Pressable onPress={comoChegar} style={styles.comoChegar} accessibilityRole="link">
          <Ionicons name="navigate-outline" size={16} color={colors.primary} />
          <Text style={styles.textoLink}>Como chegar</Text>
        </Pressable>
      )}
    </View>
  );
}

function Marcacao({ barbearia, cliente, aoMarcar }) {
  const { itens: servicos, carregando } = useColecao(
    (cb, aoErro) => observarServicos(barbearia.id, cb, aoErro),
    [barbearia.id],
  );
  const dias = useMemo(
    () => proximosDiasAbertos(barbearia.funcionamento, DIAS_A_FRENTE),
    [barbearia.funcionamento],
  );

  const [servico, setServico] = useState(null);
  const [dia, setDia] = useState(dias[0] ?? null);
  const [horario, setHorario] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [versao, setVersao] = useState(0); // força recarregar os horários

  // Horários ocupados do dia escolhido. A "chave" diz a qual dia/versão o
  // resultado pertence; se não bate com a atual, ainda está carregando.
  const chave = dia ? `${dia.getTime()}-${versao}` : null;
  const [consulta, setConsulta] = useState({ chave: null, ocupados: null, erro: null });
  const ocupados = consulta.chave === chave ? consulta.ocupados : null;
  const erroHorarios = consulta.chave === chave ? consulta.erro : null;

  useEffect(() => {
    if (!dia) return;
    let ativo = true;
    buscarOcupadosDoDia(barbearia.id, dia)
      .then((lista) => ativo && setConsulta({ chave, ocupados: lista, erro: null }))
      .catch(
        (e) => ativo && setConsulta({ chave, ocupados: null, erro: mensagemErroFirestore(e) }),
      );
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barbearia.id, chave]);

  const livres = useMemo(() => {
    if (!servico || !dia || !ocupados) return [];
    return gerarHorariosLivres({
      dia,
      funcionamento: barbearia.funcionamento,
      duracaoMin: servico.duracaoMin,
      ocupados,
    });
  }, [servico, dia, ocupados, barbearia.funcionamento]);

  function escolherServico(s) {
    setServico(s);
    setHorario(null);
  }

  function escolherDia(d) {
    setDia(d);
    setHorario(null);
  }

  async function confirmar() {
    const ok = await perguntar(
      'Confirmar pedido',
      `${servico.nome} (${formatarMoeda(servico.preco)})\n${formatarDataLonga(horario)} às ${formatarHora(horario)}\n\nO horário fica reservado e a barbearia confirma em seguida.`,
      'Pedir horário',
    );
    if (!ok) return;

    setEnviando(true);
    try {
      // Confere de novo: outro cliente pode ter pego o horário enquanto você escolhia.
      const atualizados = await buscarOcupadosDoDia(barbearia.id, dia);
      const aindaLivre = gerarHorariosLivres({
        dia,
        funcionamento: barbearia.funcionamento,
        duracaoMin: servico.duracaoMin,
        ocupados: atualizados,
      }).some((h) => h.getTime() === horario.getTime());

      if (!aindaLivre) {
        Alert.alert(
          'Horário indisponível',
          'Alguém acabou de reservar esse horário. Escolha outro.',
        );
        setConsulta({ chave, ocupados: atualizados, erro: null });
        setHorario(null);
        return;
      }

      await gravar(() =>
        solicitarAgendamento(barbearia.id, {
          clienteId: cliente.uid,
          clienteUid: cliente.uid,
          clienteNome: cliente.nome,
          clienteTelefone: cliente.telefone,
          servicoId: servico.id,
          servicoNome: servico.nome,
          preco: servico.preco,
          duracaoMin: servico.duracaoMin,
          data: horario,
        }),
      );
      Alert.alert('Pedido enviado!', 'Você pode acompanhar a confirmação em "Meus horários".');
      setHorario(null);
      setVersao((v) => v + 1);
      aoMarcar();
    } catch (erro) {
      avisarErro(erro);
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <ActivityIndicator color={colors.primary} style={styles.loader} />;
  if (!servicos.length) {
    return <Text style={styles.textoMudo}>Esta barbearia ainda não cadastrou serviços.</Text>;
  }

  return (
    <View>
      <Passo numero={1} titulo="Escolha o serviço" />
      {servicos.map((s) => {
        const ativo = servico?.id === s.id;
        return (
          <Pressable
            key={s.id}
            onPress={() => escolherServico(s)}
            style={[styles.servico, ativo && styles.servicoAtivo]}
            accessibilityRole="radio"
            accessibilityState={{ checked: ativo }}
          >
            <View style={styles.flex}>
              <Text style={[styles.nomeServico, ativo && styles.textoAtivo]}>{s.nome}</Text>
              <Text style={[styles.textoMudo, ativo && styles.textoAtivoMudo]}>
                {s.duracaoMin} min
              </Text>
            </View>
            <Text style={[styles.preco, ativo && styles.textoAtivo]}>{formatarMoeda(s.preco)}</Text>
          </Pressable>
        );
      })}

      {servico && (
        <>
          <Passo numero={2} titulo="Escolha o dia" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dias}>
            {dias.map((d) => {
              const ativo = dia && mesmoDia(d, dia);
              return (
                <Pressable
                  key={d.getTime()}
                  onPress={() => escolherDia(d)}
                  style={[styles.dia, ativo && styles.diaAtivo]}
                  accessibilityLabel={formatarDataLonga(d)}
                >
                  <Text style={[styles.diaSemana, ativo && styles.textoAtivo]}>
                    {DIAS_SEMANA[d.getDay()]}
                  </Text>
                  <Text style={[styles.diaNumero, ativo && styles.textoAtivo]}>{d.getDate()}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Passo numero={3} titulo="Escolha o horário" />
          {erroHorarios ? (
            <View style={styles.erro}>
              <Text style={styles.textoMudo}>{erroHorarios}</Text>
              <Botao
                titulo="Tentar de novo"
                variante="texto"
                onPress={() => setVersao((v) => v + 1)}
              />
            </View>
          ) : !ocupados ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : livres.length === 0 ? (
            <Text style={styles.textoMudo}>Nenhum horário livre neste dia. Tente outro dia.</Text>
          ) : (
            <View style={styles.horarios}>
              {livres.map((h) => {
                const ativo = horario?.getTime() === h.getTime();
                return (
                  <Pressable
                    key={h.getTime()}
                    onPress={() => setHorario(h)}
                    style={[styles.horario, ativo && styles.diaAtivo]}
                  >
                    <Text style={[styles.textoHorario, ativo && styles.textoAtivo]}>
                      {formatarHora(h)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Botao
            titulo={horario ? `Pedir horário das ${formatarHora(horario)}` : 'Escolha um horário'}
            icone="calendar-outline"
            onPress={confirmar}
            desabilitado={!horario}
            carregando={enviando}
            style={styles.confirmar}
          />
        </>
      )}
    </View>
  );
}

function Passo({ numero, titulo }) {
  return (
    <View style={styles.passo}>
      <View style={styles.numeroPasso}>
        <Text style={styles.textoNumero}>{numero}</Text>
      </View>
      <Text style={styles.tituloPasso}>{titulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  conteudo: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  centro: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  loader: { marginVertical: spacing.lg },
  flex: { flex: 1 },
  barbearia: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 3,
    borderTopColor: colors.accent,
    gap: 2,
  },
  nomeBarbearia: { fontSize: 22, fontFamily: fonts.titulo, color: colors.primary },
  textoMudo: { fontSize: 13, color: colors.textMuted },
  comoChegar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  textoLink: { color: colors.primary, fontWeight: '600' },
  passo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  numeroPasso: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoNumero: { color: colors.text, fontWeight: '700' },
  tituloPasso: { fontSize: 18, fontFamily: fonts.titulo, color: colors.text },
  servico: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  servicoAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  nomeServico: { fontSize: 16, fontWeight: '600', color: colors.text },
  preco: { fontSize: 16, fontFamily: fonts.titulo, color: colors.primary },
  textoAtivo: { color: colors.onPrimary },
  textoAtivoMudo: { color: colors.onPrimaryMuted },
  dias: { flexGrow: 0 },
  dia: {
    width: 60,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  diaAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  diaSemana: { fontSize: 12, color: colors.textMuted },
  diaNumero: { fontSize: 20, fontFamily: fonts.titulo, color: colors.text },
  horarios: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  horario: {
    width: '22%',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  textoHorario: { fontSize: 15, color: colors.text, fontWeight: '600' },
  erro: { gap: spacing.sm },
  confirmar: { marginTop: spacing.lg },
});
