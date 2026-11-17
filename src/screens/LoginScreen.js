import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { TelaFormulario } from '../components/TelaFormulario';
import { mensagemErroAuth, useAuth } from '../contexts/AuthContext';
import { colors, fonts, spacing } from '../theme';

export default function LoginScreen({ navigation }) {
  const { entrar, recuperarSenha } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleEntrar() {
    if (!email.trim() || !senha) {
      setErro('Informe e-mail e senha.');
      return;
    }
    setErro('');
    setCarregando(true);
    try {
      await entrar(email, senha);
      // A navegação troca sozinha para o app quando o usuário fica logado.
    } catch (e) {
      setErro(mensagemErroAuth(e));
    } finally {
      setCarregando(false);
    }
  }

  async function handleRecuperarSenha() {
    if (!email.trim()) {
      setErro('Digite seu e-mail acima para recuperar a senha.');
      return;
    }
    try {
      await recuperarSenha(email);
      Alert.alert('E-mail enviado', 'Confira sua caixa de entrada para redefinir a senha.');
    } catch (e) {
      setErro(mensagemErroAuth(e));
    }
  }

  return (
    <SafeAreaView style={styles.flex}>
      <TelaFormulario>
        <View style={styles.topo}>
          <Image source={require('../../assets/logo-duarte.png')} style={styles.logo} />
          <Text style={styles.titulo}>MarcaAí</Text>
          <View style={styles.divisor} />
          <Text style={styles.subtitulo}>Agenda da barbearia</Text>
        </View>

        <Campo
          rotulo="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="voce@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Campo
          rotulo="Senha"
          value={senha}
          onChangeText={setSenha}
          placeholder="Sua senha"
          secureTextEntry
          autoComplete="password"
        />
        {erro ? <Text style={styles.erro}>{erro}</Text> : null}

        <Botao titulo="Entrar" onPress={handleEntrar} carregando={carregando} />
        <Botao titulo="Esqueci minha senha" variante="texto" onPress={handleRecuperarSenha} />

        <View style={styles.rodape}>
          <Text style={styles.textoRodape}>Ainda não tem conta?</Text>
          <Botao
            titulo="Criar conta grátis"
            variante="secundario"
            onPress={() => navigation.navigate('Cadastro')}
          />
        </View>
      </TelaFormulario>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  topo: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl },
  logo: { width: 150, height: 150 },
  titulo: {
    fontSize: 36,
    fontFamily: fonts.titulo,
    color: colors.primary,
    marginTop: spacing.lg,
    letterSpacing: 1,
  },
  divisor: { width: 48, height: 2, backgroundColor: colors.accent, marginVertical: spacing.sm },
  subtitulo: {
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  erro: { color: colors.danger, marginBottom: spacing.md, textAlign: 'center' },
  rodape: { marginTop: spacing.xl, gap: spacing.sm },
  textoRodape: { textAlign: 'center', color: colors.textMuted },
});
