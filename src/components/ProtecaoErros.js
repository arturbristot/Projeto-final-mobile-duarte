import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../theme';
import { Botao } from './Botao';

/**
 * Error boundary: se alguma tela quebrar durante a renderização, mostra uma
 * mensagem amigável com opção de tentar de novo, em vez de uma tela branca.
 */
export class ProtecaoErros extends React.Component {
  state = { erro: null };

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error('Erro inesperado na tela:', erro, info?.componentStack);
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={56} color={colors.accent} />
        <Text style={styles.titulo}>Algo deu errado</Text>
        <Text style={styles.texto}>
          Ocorreu um erro inesperado. Seus dados estão seguros; tente abrir a tela de novo.
        </Text>
        <Botao titulo="Tentar de novo" onPress={() => this.setState({ erro: null })} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  titulo: { fontSize: 24, fontFamily: fonts.titulo, color: colors.text },
  texto: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
});
