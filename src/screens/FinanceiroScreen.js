import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Botao } from '../components/Botao';
import { BotaoFlutuante } from '../components/BotaoFlutuante';
import { Carregando } from '../components/Carregando';
import { Cartao } from '../components/Cartao';
import { GraficoBarras } from '../components/GraficoBarras';
import { useUid } from '../contexts/AuthContext';
import { buscarAgendamentosDoPeriodo } from '../services/agendamentos';
import { buscarDespesasDoPeriodo } from '../services/despesas';
import { mensagemErroFirestore } from '../services/operacao';
import { colors, fonts, radius, spacing } from '../theme';
import { intervaloDoMes, MESES, resumirFinanceiro } from '../utils/financeiro';
import { formatarDataCurta, formatarMoeda } from '../utils/format';
import { FORMAS_PAGAMENTO } from '../utils/status';

export default function FinanceiroScreen({ navigation }) {
  const uid = useUid();
  const hoje = new Date();
  const [mes, setMes] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    const { inicio, fim } = intervaloDoMes(mes.ano, mes.mes);
    try {
      const [agendamentos, despesas] = await Promise.all([
        buscarAgendamentosDoPeriodo(uid, inicio, fim),
        buscarDespesasDoPeriodo(uid, inicio, fim),
      ]);
      setDados({ resumo: resumirFinanceiro({ agendamentos, despesas }), despesas });
      setErro(null);
    } catch (e) {
      setErro(mensagemErroFirestore(e));
    }
  }, [uid, mes]);

  // Recarrega ao abrir a aba e ao voltar do cadastro de despesa.
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  function mudarMes(delta) {
    const data = new Date(mes.ano, mes.mes + delta, 1);
    setDados(null);
    setMes({ ano: data.getFullYear(), mes: data.getMonth() });
  }

  async function puxarParaAtualizar() {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }

  const ehMesAtual = mes.ano === hoje.getFullYear() && mes.mes === hoje.getMonth();

  return (
    <View style={styles.container}>
      <View style={styles.navegacao}>
        <Pressable onPress={() => mudarMes(-1)} hitSlop={12} accessibilityLabel="Mês anterior">
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <Text style={styles.mes}>
          {MESES[mes.mes]} {mes.ano}
        </Text>
        <Pressable
          onPress={() => mudarMes(1)}
          hitSlop={12}
          disabled={ehMesAtual}
          accessibilityLabel="Próximo mês"
        >
          <Ionicons
            name="chevron-forward"
            size={26}
            color={ehMesAtual ? colors.border : colors.primary}
          />
        </Pressable>
      </View>

      {erro ? (
        <View style={styles.erro}>
          <Text style={styles.textoErro}>{erro}</Text>
          <Botao titulo="Tentar de novo" variante="secundario" onPress={carregar} />
        </View>
      ) : !dados ? (
        <Carregando />
      ) : (
        <Conteudo
          dados={dados}
          navigation={navigation}
          atualizando={atualizando}
          onAtualizar={puxarParaAtualizar}
        />
      )}

      <BotaoFlutuante
        rotulo="Nova despesa"
        onPress={() => navigation.navigate('DespesaForm', {})}
      />
    </View>
  );
}

function Conteudo({ dados, navigation, atualizando, onAtualizar }) {
  const { resumo, despesas } = dados;
  const formas = [
    ...Object.entries(FORMAS_PAGAMENTO).map(([chave, rotulo]) => ({
      rotulo,
      valor: resumo.porForma[chave],
    })),
    { rotulo: 'Não informado', valor: resumo.porForma.naoInformado },
  ].filter((f) => f.valor > 0);

  return (
    <ScrollView
      contentContainerStyle={styles.conteudo}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={onAtualizar}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.linhaCards}>
        <Indicador rotulo="Receitas" valor={resumo.receita} cor={colors.success} />
        <Indicador rotulo="Despesas" valor={resumo.despesas} cor={colors.danger} />
      </View>
      <View style={styles.lucro}>
        <Text style={styles.rotuloLucro}>Lucro do mês</Text>
        <Text style={[styles.valorLucro, resumo.lucro < 0 && { color: colors.danger }]}>
          {formatarMoeda(resumo.lucro)}
        </Text>
        <Text style={styles.detalheLucro}>
          {resumo.atendimentos} atendimento(s) concluído(s) · ticket médio{' '}
          {formatarMoeda(resumo.ticketMedio)}
        </Text>
      </View>

      <Secao titulo="Por forma de pagamento">
        <GraficoBarras
          itens={formas}
          cor={colors.success}
          textoVazio="Nenhum atendimento concluído."
        />
      </Secao>

      <Secao titulo="Serviços que mais faturaram">
        <GraficoBarras
          itens={resumo.porServico.slice(0, 5).map((s) => ({
            rotulo: s.nome,
            valor: s.total,
            detalhe: `${s.quantidade}x`,
          }))}
          textoVazio="Nenhum atendimento concluído."
        />
      </Secao>

      <Secao titulo={`Despesas (${despesas.length})`}>
        {despesas.length === 0 ? (
          <Text style={styles.vazio}>Nenhuma despesa lançada. Toque no + para adicionar.</Text>
        ) : (
          despesas.map((d) => (
            <Cartao
              key={d.id}
              onPress={() => navigation.navigate('DespesaForm', { despesaId: d.id })}
            >
              <View style={styles.linhaDespesa}>
                <View style={styles.flex}>
                  <Text style={styles.descricao}>{d.descricao}</Text>
                  <Text style={styles.detalhe}>
                    {d.categoria} · {formatarDataCurta(d.data)}
                  </Text>
                </View>
                <Text style={styles.valorDespesa}>- {formatarMoeda(d.valor)}</Text>
              </View>
            </Cartao>
          ))
        )}
      </Secao>
    </ScrollView>
  );
}

function Indicador({ rotulo, valor, cor }) {
  return (
    <View style={[styles.indicador, { borderTopColor: cor }]}>
      <Text style={styles.rotuloIndicador}>{rotulo}</Text>
      <Text style={[styles.valorIndicador, { color: cor }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatarMoeda(valor)}
      </Text>
    </View>
  );
}

function Secao({ titulo, children }) {
  return (
    <View style={styles.secao}>
      <Text style={styles.tituloSecao}>{titulo}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  navegacao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  mes: { fontSize: 19, fontFamily: fonts.titulo, color: colors.text },
  conteudo: { padding: spacing.md, paddingBottom: 100 },
  linhaCards: { flexDirection: 'row', gap: spacing.sm },
  indicador: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 3,
  },
  rotuloIndicador: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  valorIndicador: { fontSize: 20, fontFamily: fonts.titulo, marginTop: spacing.xs },
  lucro: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  rotuloLucro: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  valorLucro: { fontSize: 30, fontFamily: fonts.titulo, color: colors.primary, marginTop: 2 },
  detalheLucro: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs },
  secao: { marginTop: spacing.xl },
  tituloSecao: {
    fontSize: 19,
    fontFamily: fonts.titulo,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  vazio: { fontSize: 14, color: colors.textMuted },
  linhaDespesa: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  descricao: { fontSize: 15, fontWeight: '600', color: colors.text },
  detalhe: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  valorDespesa: { fontSize: 15, fontWeight: '700', color: colors.danger },
  erro: { padding: spacing.lg, gap: spacing.md },
  textoErro: { color: colors.textMuted, textAlign: 'center' },
});
