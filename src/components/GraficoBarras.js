import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { formatarMoeda } from '../utils/format';

/**
 * Gráfico de barras horizontais.
 * `itens`: [{ rotulo, valor, detalhe? }]. A maior barra ocupa a largura toda.
 */
export function GraficoBarras({
  itens,
  cor = colors.primary,
  textoVazio = 'Sem dados no período.',
}) {
  const maior = Math.max(...itens.map((i) => i.valor), 0);

  if (maior === 0) return <Text style={styles.vazio}>{textoVazio}</Text>;

  return (
    <View style={styles.container}>
      {itens.map((item) => (
        <View
          key={item.rotulo}
          style={styles.item}
          accessible
          accessibilityLabel={`${item.rotulo}: ${formatarMoeda(item.valor)}`}
        >
          <View style={styles.cabecalho}>
            <Text style={styles.rotulo} numberOfLines={1}>
              {item.rotulo}
              {item.detalhe ? <Text style={styles.detalhe}> · {item.detalhe}</Text> : null}
            </Text>
            <Text style={styles.valor}>{formatarMoeda(item.valor)}</Text>
          </View>
          <View style={styles.trilho}>
            <View
              style={[
                styles.barra,
                { width: `${Math.max((item.valor / maior) * 100, 2)}%`, backgroundColor: cor },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  item: { gap: spacing.xs },
  cabecalho: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  rotulo: { flex: 1, fontSize: 14, color: colors.text },
  detalhe: { color: colors.textMuted, fontSize: 12 },
  valor: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  trilho: { height: 8, borderRadius: radius.sm, backgroundColor: colors.primaryLight },
  barra: { height: 8, borderRadius: radius.sm },
  vazio: { fontSize: 14, color: colors.textMuted },
});
