import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

export function Cartao({ children, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.cartao, pressed && styles.pressionado, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressionado: { backgroundColor: colors.primaryLight },
});
