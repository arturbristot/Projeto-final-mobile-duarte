import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BotaoFlutuante } from '../components/BotaoFlutuante';
import { Cartao } from '../components/Cartao';
import { ListaVazia } from '../components/ListaVazia';
import { useUid } from '../contexts/AuthContext';
import { useColecao } from '../hooks/useColecao';
import { observarServicos } from '../services/servicos';
import { colors, fonts, spacing } from '../theme';
import { formatarMoeda } from '../utils/format';

export default function ServicosScreen({ navigation }) {
  const uid = useUid();
  const { itens: servicos, carregando } = useColecao(
    (cb, aoErro) => observarServicos(uid, cb, aoErro),
    [uid],
  );

  if (carregando) return <ActivityIndicator style={styles.loader} color={colors.primary} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={servicos}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <ListaVazia
            icone="cut-outline"
            titulo="Nenhum serviço cadastrado"
            descricao="Cadastre os serviços que você oferece, como corte, barba e escova."
          />
        }
        renderItem={({ item }) => (
          <Cartao onPress={() => navigation.navigate('ServicoForm', { servicoId: item.id })}>
            <View style={styles.linha}>
              <View style={styles.flex}>
                <Text style={styles.nome}>{item.nome}</Text>
                <Text style={styles.detalhe}>
                  <Ionicons name="time-outline" size={13} /> {item.duracaoMin} min
                </Text>
              </View>
              <Text style={styles.preco}>{formatarMoeda(item.preco)}</Text>
            </View>
          </Cartao>
        )}
      />
      <BotaoFlutuante
        rotulo="Novo serviço"
        onPress={() => navigation.navigate('ServicoForm', {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1 },
  lista: { padding: spacing.md, paddingBottom: 100 },
  linha: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  nome: { fontSize: 16, fontWeight: '600', color: colors.text },
  detalhe: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  preco: { fontSize: 17, fontFamily: fonts.titulo, color: colors.primary },
});
