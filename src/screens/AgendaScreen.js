import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BotaoFlutuante } from '../components/BotaoFlutuante';
import { Cartao } from '../components/Cartao';
import { ListaVazia } from '../components/ListaVazia';
import { useAuth, useUid } from '../contexts/AuthContext';
import { useColecao } from '../hooks/useColecao';
import { SeloStatus, COR_STATUS } from '../components/SeloStatus';
import {
  observarAgendamentosDoDia,
  observarPendentes,
  sincronizarHorariosOcupados,
} from '../services/agendamentos';
import { colors, fonts, radius, spacing } from '../theme';
import {
  formatarDataLonga,
  formatarHora,
  formatarMoeda,
  inicioDoDia,
  mesmoDia,
  somarDias,
} from '../utils/format';
import { STATUS, statusOcupaHorario } from '../utils/status';
import { enviarLembreteWhatsApp } from '../utils/whatsapp';

export default function AgendaScreen({ navigation }) {
  const uid = useUid();
  const { perfil } = useAuth();
  const [dia, setDia] = useState(() => inicioDoDia(new Date()));
  const { itens: agendamentos, carregando } = useColecao(
    (cb, aoErro) => observarAgendamentosDoDia(uid, dia, cb, aoErro),
    [uid, dia.getTime()],
  );
  const { itens: pendentes } = useColecao(
    (cb, aoErro) => observarPendentes(uid, cb, aoErro),
    [uid],
  );

  useEffect(() => {
    // Garante que agendamentos antigos bloqueiem horários na área do cliente.
    sincronizarHorariosOcupados(uid).catch(() => {});
  }, [uid]);

  const ativos = agendamentos.filter((a) => statusOcupaHorario(a.status));
  const previsto = ativos.reduce((soma, a) => soma + a.preco, 0);
  const recebido = ativos
    .filter((a) => a.status === STATUS.CONCLUIDO)
    .reduce((soma, a) => soma + a.preco, 0);
  const nomeNegocio = perfil?.nome ?? 'nossa barbearia';
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

      {pendentes.length > 0 && (
        <Pressable
          style={styles.avisoPendentes}
          onPress={() => navigation.navigate('Pendentes')}
          accessibilityRole="button"
        >
          <Ionicons name="notifications" size={20} color={colors.onPrimary} />
          <Text style={styles.textoPendentes}>
            {pendentes.length === 1
              ? '1 pedido de horário aguardando você'
              : `${pendentes.length} pedidos de horário aguardando você`}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.onPrimary} />
        </Pressable>
      )}

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
            const cor = COR_STATUS[item.status];
            return (
              <Cartao
                onPress={() => navigation.navigate('AgendamentoForm', { agendamentoId: item.id })}
                style={statusOcupaHorario(item.status) ? undefined : styles.cancelado}
              >
                <View style={styles.linha}>
                  <View style={[styles.hora, { borderColor: cor }]}>
                    <Text style={[styles.textoHora, { color: cor }]}>
                      {formatarHora(item.data)}
                    </Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.cliente}>{item.clienteNome}</Text>
                    <Text style={styles.servico}>
                      {item.servicoNome} · {formatarMoeda(item.preco)}
                    </Text>
                    <SeloStatus status={item.status} />
                  </View>
                  {item.status === STATUS.AGENDADO && (
                    <Pressable
                      onPress={() => enviarLembreteWhatsApp(item, nomeNegocio)}
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
  avisoPendentes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warning,
  },
  textoPendentes: { flex: 1, color: colors.onPrimary, fontWeight: '700' },
  cancelado: { opacity: 0.55 },
});
