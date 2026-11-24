import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

/**
 * Grupo de opções em "pílulas".
 * - Seleção única: `valor` é o valor escolhido.
 * - `multipla`: `valor` é uma lista e cada toque liga/desliga a opção.
 */
export function Opcoes({ rotulo, opcoes, valor, onChange, multipla = false, erro }) {
  function selecionado(v) {
    return multipla ? valor.includes(v) : valor === v;
  }

  function tocar(v) {
    if (!multipla) return onChange(v);
    onChange(selecionado(v) ? valor.filter((x) => x !== v) : [...valor, v]);
  }

  return (
    <View style={styles.container}>
      {rotulo ? <Text style={styles.rotulo}>{rotulo}</Text> : null}
      <View style={styles.linha}>
        {opcoes.map((o) => {
          const ativo = selecionado(o.valor);
          return (
            <Pressable
              key={String(o.valor)}
              onPress={() => tocar(o.valor)}
              accessibilityRole={multipla ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: ativo }}
              style={[styles.opcao, ativo && styles.opcaoAtiva]}
            >
              {o.icone ? (
                <Ionicons
                  name={o.icone}
                  size={16}
                  color={ativo ? colors.onPrimary : colors.primary}
                />
              ) : null}
              <Text style={[styles.texto, ativo && styles.textoAtivo]}>{o.rotulo}</Text>
            </Pressable>
          );
        })}
      </View>
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  rotulo: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  opcaoAtiva: { backgroundColor: colors.primary, borderColor: colors.primary },
  texto: { fontSize: 14, color: colors.text },
  textoAtivo: { color: colors.onPrimary, fontWeight: '600' },
  erro: { color: colors.danger, fontSize: 13, marginTop: spacing.xs },
});
