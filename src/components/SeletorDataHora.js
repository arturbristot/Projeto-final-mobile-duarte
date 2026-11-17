import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';
import { formatarDataCurta, formatarHora } from '../utils/format';

/**
 * Escolha de data e hora. No Android o seletor abre como diálogo;
 * no iOS usa o estilo "compact" nativo.
 */
export function SeletorDataHora({ valor, onChange }) {
  const [modoAndroid, setModoAndroid] = useState(null);

  function aoAlterar(evento, data) {
    setModoAndroid(null);
    if (evento.type === 'set' && data) onChange(data);
  }

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.linha}>
        <DateTimePicker
          value={valor}
          mode="date"
          display="compact"
          themeVariant="dark"
          locale="pt-BR"
          onChange={aoAlterar}
        />
        <DateTimePicker
          value={valor}
          mode="time"
          display="compact"
          themeVariant="dark"
          locale="pt-BR"
          minuteInterval={5}
          onChange={aoAlterar}
        />
      </View>
    );
  }

  return (
    <View style={styles.linha}>
      <BotaoCampo
        icone="calendar-outline"
        texto={formatarDataCurta(valor)}
        onPress={() => setModoAndroid('date')}
      />
      <BotaoCampo
        icone="time-outline"
        texto={formatarHora(valor)}
        onPress={() => setModoAndroid('time')}
      />
      {modoAndroid && (
        <DateTimePicker value={valor} mode={modoAndroid} is24Hour onChange={aoAlterar} />
      )}
    </View>
  );
}

function BotaoCampo({ icone, texto, onPress }) {
  return (
    <Pressable style={styles.campo} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icone} size={18} color={colors.primary} />
      <Text style={styles.texto}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  campo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  texto: { fontSize: 16, color: colors.text },
});
