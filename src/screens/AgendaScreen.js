import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BotaoFlutuante } from '../components/BotaoFlutuante';
import { Cartao } from '../components/Cartao';
import { ListaVazia } from '../components/ListaVazia';
import { useAuth, useUid } from '../contexts/AuthContext';
import { useColecao } from '../hooks/useColecao';
import { observarAgendamentosDoDia } from '../services/agendamentos';
import { colors, fonts, radius, spacing } from '../theme';
import {
  formatarDataLonga,
  formatarHora,
  formatarMoeda,
  inicioDoDia,
  mesmoDia,
  somarDias,
} from '../utils/format';
import { enviarLembreteWhatsApp } from '../utils/whatsapp';

const estiloStatus = {
  agendado: { rotulo: 'Agendado', cor: colors.primary },
  concluido: { rotulo: 'Concluído', cor: colors.success },
  cancelado: { rotulo: 'Cancelado', cor: colors.danger },
};

export default function AgendaScreen({ navigation }) {
  const uid = useUid();
  const { user } = useAuth();
  const [dia, setDia] = useState(() => inicioDoDia(new Date()));
  const { itens: agendamentos, carregando } = useColecao(
    (cb, aoErro) => observarAgendamentosDoDia(uid, dia, cb, aoErro),
    [uid, dia.getTime()],
  );

  const ativos = agendamentos.filter((a) => a.status !== 'cancelado');
  const previsto = ativos.reduce((soma, a) => soma + a.preco, 0);
  const recebido = ativos
    .filter((a) => a.status === 'concluido')
    .reduce((soma, a) => soma + a.preco, 0);
  const ehHoje = mesmoDia(dia, new Date());

  return (
    <View style={styles.container}>
      <View style={styles.navegacaoDia}>
        <Pressable
          onPress={() => setDia(somarDias(dia, -1))}
          hitSlop={12}
          accessibilityLabel="Dia anterior"
        >
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => setDia(inicioDoDia(new Date()))} style={styles.centroDia}>
          <Text style={styles.textoDia}>{ehHoje ? 'Hoje' : formatarDataLonga(dia)}</Text>
          {ehHoje ? (
            <Text style={styles.subDia}>{formatarDataLonga(dia)}</Text>
          ) : (
            <Text style={styles.subDia}>Toque para voltar a hoje</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => setDia(somarDias(dia, 1))}
          hitSlop={12}
          accessibilityLabel="Próximo dia"
        >
          <Ionicons name="chevron-forward" size={26} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.resumo}>
        <Indicador valor={String(ativos.length)} rotulo="Atendimentos" />
        <Indicador valor={formatarMoeda(previsto)} rotulo="Previsto" />
        <Indicador valor={formatarMoeda(recebido)} rotulo="Concluído" />
      </View>

      {carregando ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={agendamentos}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <ListaVazia
              icone="calendar-clear-outline"
              titulo="Nenhum horário marcado"
              descricao="Toque no + para agendar um cliente neste dia."
            />
          }
          renderItem={({ item }) => {
            const status = estiloStatus[item.status];
            return (
              <Cartao
                onPress={() => navigation.navigate('AgendamentoForm', { agendamentoId: item.id })}
                style={item.status === 'cancelado' ? styles.cancelado : undefined}
              >
                <View style={styles.linha}>
                  <View style={[styles.hora, { borderColor: status.cor }]}>
                    <Text style={[styles.textoHora, { color: status.cor }]}>
                      {formatarHora(item.data)}
                    </Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.cliente}>{item.clienteNome}</Text>
                    <Text style={styles.servico}>
                      {item.servicoNome} · {formatarMoeda(item.preco)}
                    </Text>
                    <Text style={[styles.status, { color: status.cor }]}>{status.rotulo}</Text>
                  </View>
                  {item.status === 'agendado' && (
                    <Pressable
                      onPress={() =>
                        enviarLembreteWhatsApp(item, user?.displayName ?? 'nosso salão')
                      }
                      hitSlop={10}
                      accessibilityLabel={`Enviar lembrete para ${item.clienteNome}`}
                    >
                      <Ionicons name="logo-whatsapp" size={26} color={colors.whatsapp} />
                    </Pressable>
                  )}
                </View>
              </Cartao>
            );
          }}
        />
      )}

      <BotaoFlutuante
        rotulo="Novo agendamento"
        onPress={() => navigation.navigate('AgendamentoForm', { dataInicial: dia.getTime() })}
      />
    </View>
  );
}

function Indicador({ valor, rotulo }) {
  return (
    <View style={styles.indicador}>
      <Text style={styles.valorIndicador} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      <Text style={styles.rotuloIndicador}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: spacing.xl },
  navegacaoDia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  centroDia: { alignItems: 'center', flex: 1 },
  textoDia: {
    fontSize: 19,
    fontFamily: fonts.titulo,
    color: colors.text,
    textTransform: 'capitalize',
  },
  subDia: { fontSize: 12, color: colors.textMuted },
  resumo: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, paddingBottom: 0 },
  indicador: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 3,
    borderTopColor: colors.accent,
    padding: spacing.sm,
    alignItems: 'center',
  },
  valorIndicador: { fontSize: 17, fontFamily: fonts.titulo, color: colors.primary },
  rotuloIndicador: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lista: { padding: spacing.md, paddingBottom: 100 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hora: { borderLeftWidth: 3, paddingLeft: spacing.sm, minWidth: 62 },
  textoHora: { fontSize: 17, fontWeight: '700' },
  flex: { flex: 1 },
  cliente: { fontSize: 16, fontWeight: '600', color: colors.text },
  servico: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  status: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  cancelado: { opacity: 0.55 },
});
