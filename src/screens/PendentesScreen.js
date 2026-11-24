import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Botao } from '../components/Botao';
import { Carregando } from '../components/Carregando';
import { Cartao } from '../components/Cartao';
import { ListaVazia } from '../components/ListaVazia';
import { useUid } from '../contexts/AuthContext';
import { useColecao } from '../hooks/useColecao';
import { alterarStatus, buscarConflito, observarPendentes } from '../services/agendamentos';
import { avisarErro, avisarSePendente, gravar, perguntar } from '../services/operacao';
import { colors, fonts, spacing } from '../theme';
import { formatarDataLonga, formatarHora, formatarMoeda } from '../utils/format';
import { STATUS } from '../utils/status';

export default function PendentesScreen({ navigation }) {
  const uid = useUid();
  const [processando, setProcessando] = useState(null);
  const { itens: pendentes, carregando } = useColecao(
    (cb, aoErro) => observarPendentes(uid, cb, aoErro),
    [uid],
  );

  async function responder(pedido, status) {
    setProcessando(pedido.id);
    try {
      if (status === STATUS.AGENDADO) {
        const conflito = await buscarConflito(uid, pedido.data, pedido.duracaoMin, pedido.id).catch(
          () => null,
        );
        if (conflito) {
          const ok = await perguntar(
            'Horário ocupado',
            `Às ${formatarHora(conflito.data)} já existe ${conflito.servicoNome} com ${conflito.clienteNome}. Aceitar mesmo assim?`,
            'Aceitar',
          );
          if (!ok) return;
        }
      }
      avisarSePendente(await gravar(() => alterarStatus(uid, pedido, status)));
    } catch (erro) {
      avisarErro(erro);
    } finally {
      setProcessando(null);
    }
  }

  if (carregando) return <Carregando />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.lista}
      data={pendentes}
      keyExtractor={(p) => p.id}
      ListEmptyComponent={
        <ListaVazia
          icone="checkmark-done-outline"
          titulo="Nenhum pedido pendente"
          descricao="Quando um cliente marcar pelo app, o pedido aparece aqui."
        />
      }
      renderItem={({ item }) => (
        <Cartao onPress={() => navigation.navigate('AgendamentoForm', { agendamentoId: item.id })}>
          <Text style={styles.data}>
            {formatarDataLonga(item.data)} · {formatarHora(item.data)}
          </Text>
          <Text style={styles.cliente}>{item.clienteNome}</Text>
          <Text style={styles.detalhe}>
            {item.servicoNome} · {formatarMoeda(item.preco)} · {item.clienteTelefone}
          </Text>
          <View style={styles.acoes}>
            <Botao
              titulo="Recusar"
              variante="perigo"
              style={styles.botao}
              onPress={() => responder(item, STATUS.RECUSADO)}
              desabilitado={processando !== null}
            />
            <Botao
              titulo="Aceitar"
              icone="checkmark"
              style={styles.botao}
              onPress={() => responder(item, STATUS.AGENDADO)}
              carregando={processando === item.id}
              desabilitado={processando !== null}
            />
          </View>
        </Cartao>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  lista: { padding: spacing.md },
  data: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cliente: { fontSize: 18, fontFamily: fonts.titulo, color: colors.text, marginTop: spacing.xs },
  detalhe: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  acoes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  botao: { flex: 1, minHeight: 44 },
});
