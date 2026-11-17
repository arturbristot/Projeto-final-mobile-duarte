import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

const estilosVariante = {
  primario: { fundo: colors.primary, texto: colors.onPrimary, borda: colors.primary },
  secundario: { fundo: 'transparent', texto: colors.primary, borda: colors.primary },
  perigo: { fundo: 'transparent', texto: colors.danger, borda: colors.danger },
  texto: { fundo: 'transparent', texto: colors.primary, borda: 'transparent' },
};

export function Botao({
  titulo,
  onPress,
  variante = 'primario',
  carregando = false,
  desabilitado = false,
  icone,
  style,
}) {
  const v = estilosVariante[variante];
  const inativo = desabilitado || carregando;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inativo}
      style={({ pressed }) => [
        styles.botao,
        {
          backgroundColor: v.fundo,
          borderColor: v.borda,
          opacity: inativo ? 0.6 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={v.texto} />
      ) : (
        <>
          {icone && <Ionicons name={icone} size={18} color={v.texto} />}
          <Text style={[styles.texto, { color: v.texto }]}>{titulo}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  texto: { fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
});
