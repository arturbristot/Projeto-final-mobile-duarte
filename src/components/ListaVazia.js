import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

export function ListaVazia({ icone, titulo, descricao }) {
  return (
    <View style={styles.container}>
      <Ionicons name={icone} size={56} color={colors.border} />
      <Text style={styles.titulo}>{titulo}</Text>
      {descricao ? <Text style={styles.descricao}>{descricao}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  titulo: { fontSize: 17, fontWeight: '600', color: colors.text, marginTop: spacing.md },
  descricao: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
});
