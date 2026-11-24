import React, { useEffect, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { Botao } from '../../components/Botao';
import { Carregando } from '../../components/Carregando';
import { Cartao } from '../../components/Cartao';
import { ListaVazia } from '../../components/ListaVazia';
import { SeloStatus } from '../../components/SeloStatus';
import { useUid } from '../../contexts/AuthContext';
import { cancelarPeloCliente, observarMeusAgendamentos } from '../../services/agendamentos';
import { avisarErro, gravar, mensagemErroFirestore, perguntar } from '../../services/operacao';
import { listarBarbearias } from '../../services/perfil';
import { colors, fonts, spacing } from '../../theme';
import { formatarDataLonga, formatarHora, formatarMoeda } from '../../utils/format';
import { clientePodeCancelar } from '../../utils/status';

/**
 * Agendamentos do cliente em todas as barbearias, em tempo real:
 * assim que o barbeiro aceita ou recusa, a situação muda aqui.
 */
function useMeusAgendamentos(uid) {
  const [estado, setEstado] = useState({ lista: null, erro: null });

  useEffect(() => {
    let paradas = [];
    let ativo = true;
    const porBarbearia = {};

    function publicar() {
      const lista = Object.values(porBarbearia).flat();
      setEstado({ lista: lista.sort((a, b) => b.data - a.data), erro: null });
    }

    listarBarbearias()
      .then((barbearias) => {
        if (!ativo) return;
        if (!barbearias.length) setEstado({ lista: [], erro: null });
        paradas = barbearias.map((b) =>
          observarMeusAgendamentos(
            b.id,
            uid,
            (itens) => {
              porBarbearia[b.id] = itens.map((a) => ({ ...a, barbearia: b }));
              publicar();
            },
            (e) => setEstado({ lista: null, erro: mensagemErroFirestore(e) }),
          ),
        );
      })
      .catch((e) => ativo && setEstado({ lista: null, erro: mensagemErroFirestore(e) }));

    return () => {
      ativo = false;
      paradas.forEach((parar) => parar());
    };
  }, [uid]);

  return estado;
}

export default function MeusHorariosScreen({ navigation }) {
  const uid = useUid();
  const { lista, erro } = useMeusAgendamentos(uid);
  const [cancelando, setCancelando] = useState(null);

  async function cancelar(agendamento) {
    const ok = await perguntar(
      'Cancelar horário',
      `Cancelar ${agendamento.servicoNome} em ${formatarDataLonga(agendamento.data)} às ${formatarHora(agendamento.data)}?`,
      'Cancelar horário',
      'Voltar',
    );
    if (!ok) return;
    setCancelando(agendamento.id);
    try {
      await gravar(() => cancelarPeloCliente(agendamento.barbearia.id, agendamento));
    } catch (e) {
      avisarErro(e);
    } finally {
      setCancelando(null);
    }
  }

  if (erro) {
    return (
      <View style={styles.centro}>
        <Text style={styles.textoMudo}>{erro}</Text>
      </View>
    );
  }
  if (!lista) return <Carregando />;

  const agora = new Date();
  const secoes = [
    { titulo: 'Próximos', data: lista.filter((a) => a.data >= agora).reverse() },
    { titulo: 'Anteriores', data: lista.filter((a) => a.data < agora) },
  ].filter((s) => s.data.length);

  return (
    <SectionList
      style={styles.container}
      contentContainerStyle={styles.lista}
      sections={secoes}
      keyExtractor={(a) => a.id}
      stickySectionHeadersEnabled={false}
      ListEmptyComponent={
        <View>
          <ListaVazia
            icone="calendar-outline"
            titulo="Você ainda não marcou nenhum horário"
            descricao="Escolha um serviço e um horário livre na aba Agendar."
          />
          <Botao titulo="Agendar agora" onPress={() => navigation.navigate('Agendar')} />
        </View>
      }
      renderSectionHeader={({ section }) => <Text style={styles.secao}>{section.titulo}</Text>}
      renderItem={({ item }) => (
        <Cartao>
          <Text style={styles.data}>
            {formatarDataLonga(item.data)} · {formatarHora(item.data)}
          </Text>
          <Text style={styles.servico}>{item.servicoNome}</Text>
          <Text style={styles.textoMudo}>
            {item.barbearia.nome} · {formatarMoeda(item.preco)}
          </Text>
          <SeloStatus status={item.status} />
          {clientePodeCancelar(item, agora) && (
            <Botao
              titulo="Cancelar horário"
              variante="perigo"
              icone="close-circle-outline"
              onPress={() => cancelar(item)}
              carregando={cancelando === item.id}
              desabilitado={cancelando !== null}
              style={styles.botaoCancelar}
            />
          )}
        </Cartao>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  lista: { padding: spacing.md, paddingBottom: spacing.xl },
  centro: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  secao: {
    fontSize: 19,
    fontFamily: fonts.titulo,
    color: colors.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  data: { fontSize: 13, color: colors.textMuted, textTransform: 'capitalize' },
  servico: { fontSize: 18, fontFamily: fonts.titulo, color: colors.text, marginTop: 2 },
  textoMudo: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  botaoCancelar: { marginTop: spacing.md, minHeight: 44 },
});
