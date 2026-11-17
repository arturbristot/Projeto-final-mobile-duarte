import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../theme';

/** Campo que abre uma lista pesquisável em tela cheia para escolher um item. */
export function SeletorItem({
  rotulo,
  placeholder,
  itens,
  selecionadoId,
  onSelecionar,
  erro,
  textoVazio,
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const selecionado = itens.find((i) => i.id === selecionadoId);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return termo ? itens.filter((i) => i.titulo.toLowerCase().includes(termo)) : itens;
  }, [itens, busca]);

  function escolher(id) {
    onSelecionar(id);
    setAberto(false);
    setBusca('');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <Pressable
        style={[styles.campo, erro ? styles.campoErro : null]}
        onPress={() => setAberto(true)}
        accessibilityRole="button"
        accessibilityLabel={rotulo}
      >
        <View style={styles.flex}>
          <Text style={selecionado ? styles.valor : styles.placeholder}>
            {selecionado?.titulo ?? placeholder}
          </Text>
          {selecionado?.subtitulo ? <Text style={styles.sub}>{selecionado.subtitulo}</Text> : null}
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </Pressable>
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

      <Modal visible={aberto} animationType="slide" onRequestClose={() => setAberto(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.cabecalho}>
            <Text style={styles.tituloModal}>{rotulo}</Text>
            <Pressable onPress={() => setAberto(false)} accessibilityLabel="Fechar" hitSlop={12}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar..."
            keyboardAppearance="dark"
            placeholderTextColor={colors.textMuted}
            style={styles.busca}
            autoFocus
          />
          <FlatList
            data={filtrados}
            keyExtractor={(i) => i.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.vazio}>{textoVazio}</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.opcao} onPress={() => escolher(item.id)}>
                <View style={styles.flex}>
                  <Text style={styles.valor}>{item.titulo}</Text>
                  {item.subtitulo ? <Text style={styles.sub}>{item.subtitulo}</Text> : null}
                </View>
                {item.id === selecionadoId && (
                  <Ionicons name="checkmark" size={22} color={colors.primary} />
                )}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  flex: { flex: 1 },
  rotulo: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  campoErro: { borderColor: colors.danger },
  valor: { fontSize: 16, color: colors.text },
  placeholder: { fontSize: 16, color: colors.textMuted },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  erro: { color: colors.danger, fontSize: 13, marginTop: spacing.xs },
  modal: { flex: 1, backgroundColor: colors.background },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  tituloModal: { fontSize: 22, fontFamily: fonts.titulo, color: colors.text },
  busca: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.text,
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  vazio: { textAlign: 'center', color: colors.textMuted, padding: spacing.xl },
});
