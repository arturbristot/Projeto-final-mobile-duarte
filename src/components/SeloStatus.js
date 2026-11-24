import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../theme';
import { ROTULO_STATUS } from '../utils/status';

export const COR_STATUS = {
  pendente: colors.warning,
  agendado: colors.primary,
  concluido: colors.success,
  cancelado: colors.danger,
  recusado: colors.danger,
};

/** Texto colorido com a situação do agendamento. */
export function SeloStatus({ status, style }) {
  return (
    <Text style={[styles.selo, { color: COR_STATUS[status] ?? colors.textMuted }, style]}>
      {ROTULO_STATUS[status] ?? status}
    </Text>
  );
}

const styles = StyleSheet.create({
  selo: { fontSize: 12, fontWeight: '600', marginTop: 4 },
});
