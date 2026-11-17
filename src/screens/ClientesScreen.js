import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BotaoFlutuante } from '../components/BotaoFlutuante';
import { Cartao } from '../components/Cartao';
import { ListaVazia } from '../components/ListaVazia';
import { useUid } from '../contexts/AuthContext';
import { useColecao } from '../hooks/useColecao';
import { observarClientes } from '../services/clientes';
import { colors, fonts, radius, spacing } from '../theme';

/** Remove acentos e caixa para a busca: "José" encontra "jose". */
function normalizar(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function ClientesScreen({ navigation }) {
  const uid = useUid();
  const [busca, setBusca] = useState('');
  const { itens: clientes, carregando } = useColecao(
    (cb, aoErro) => observarClientes(uid, cb, aoErro),
    [uid],
  );

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return clientes;
    return clientes.filter((c) => normalizar(c.nome).includes(termo) || c.telefone.includes(termo));
  }, [clientes, busca]);

  if (carregando) return <ActivityIndicator style={styles.loader} color={colors.primary} />;

  return (
    <View style={styles.container}>
      <View style={styles.busca}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por nome ou telefone"
          keyboardAppearance="dark"
          placeholderTextColor={colors.textMuted}
          style={styles.inputBusca}
          accessibilityLabel="Buscar cliente"
        />
      </View>
      <FlatList
        data={filtrados}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <ListaVazia
            icone="people-outline"
            titulo={busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            descricao={busca ? undefined : 'Toque no + para cadastrar seu primeiro cliente.'}
          />
        }
        renderItem={({ item }) => (
          <Cartao onPress={() => navigation.navigate('ClienteForm', { clienteId: item.id })}>
            <View style={styles.linha}>
              <View style={styles.avatar}>
                <Text style={styles.inicial}>{item.nome.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.nome}>{item.nome}</Text>
                <Text style={styles.telefone}>{item.telefone}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </Cartao>
        )}
      />
      <BotaoFlutuante
        rotulo="Novo cliente"
        onPress={() => navigation.navigate('ClienteForm', {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1 },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    marginBottom: 0,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputBusca: { flex: 1, minHeight: 44, fontSize: 15, color: colors.text },
  lista: { padding: spacing.md, paddingBottom: 100 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inicial: { fontSize: 18, fontFamily: fonts.titulo, color: colors.primary },
  flex: { flex: 1 },
  nome: { fontSize: 16, fontWeight: '600', color: colors.text },
  telefone: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
