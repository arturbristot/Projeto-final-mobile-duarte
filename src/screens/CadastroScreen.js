import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { TelaFormulario } from '../components/TelaFormulario';
import { mensagemErroAuth, useAuth } from '../contexts/AuthContext';
import { colors, fonts, spacing } from '../theme';

export default function CadastroScreen({ navigation }) {
  const { cadastrar } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState({});
  const [carregando, setCarregando] = useState(false);

  function validar() {
    const e = {};
    if (nome.trim().length < 2) e.nome = 'Informe o nome do salão ou barbearia.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'E-mail inválido.';
    if (senha.length < 6) e.senha = 'Mínimo de 6 caracteres.';
    if (confirmacao !== senha) e.confirmacao = 'As senhas não conferem.';
    return e;
  }

  async function handleCadastrar() {
    const e = validar();
    setErros(e);
    if (Object.keys(e).length) return;

    setCarregando(true);
    try {
      await cadastrar(nome.trim(), email, senha);
    } catch (err) {
      setErros({ geral: mensagemErroAuth(err) });
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={styles.flex}>
      <TelaFormulario>
        <View style={styles.topo}>
          <Text style={styles.titulo}>Criar conta</Text>
          <Text style={styles.subtitulo}>Cadastre seu negócio e comece a organizar a agenda.</Text>
        </View>

        <Campo
          rotulo="Nome do negócio"
          value={nome}
          onChangeText={setNome}
          placeholder="Ex.: Barbearia do Zé"
          erro={erros.nome}
        />
        <Campo
          rotulo="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="voce@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          erro={erros.email}
        />
        <Campo
          rotulo="Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          placeholder="Mínimo 6 caracteres"
          erro={erros.senha}
        />
        <Campo
          rotulo="Confirmar senha"
          value={confirmacao}
          onChangeText={setConfirmacao}
          secureTextEntry
          erro={erros.confirmacao}
        />
        {erros.geral ? <Text style={styles.erro}>{erros.geral}</Text> : null}

        <Botao titulo="Cadastrar" onPress={handleCadastrar} carregando={carregando} />
        <Botao titulo="Já tenho conta" variante="texto" onPress={() => navigation.goBack()} />
      </TelaFormulario>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  topo: { marginTop: spacing.lg, marginBottom: spacing.lg },
  titulo: { fontSize: 30, fontFamily: fonts.titulo, color: colors.primary },
  subtitulo: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
  erro: { color: colors.danger, marginBottom: spacing.md, textAlign: 'center' },
});
