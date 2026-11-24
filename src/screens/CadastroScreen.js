import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { Opcoes } from '../components/Opcoes';
import { TelaFormulario } from '../components/TelaFormulario';
import { mensagemErroAuth, useAuth } from '../contexts/AuthContext';
import { TIPO } from '../services/perfil';
import { colors, fonts, spacing } from '../theme';
import { formatarTelefone } from '../utils/format';
import { validarCadastro } from '../utils/validacao';

const TIPOS = [
  { valor: TIPO.CLIENTE, rotulo: 'Sou cliente', icone: 'person-outline' },
  { valor: TIPO.BARBEIRO, rotulo: 'Tenho uma barbearia', icone: 'cut-outline' },
];

export default function CadastroScreen({ navigation }) {
  const { cadastrar } = useAuth();
  const [tipo, setTipo] = useState(TIPO.CLIENTE);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState({});
  const [carregando, setCarregando] = useState(false);
  const ehCliente = tipo === TIPO.CLIENTE;

  async function handleCadastrar() {
    const {
      valido,
      erros: e,
      dados,
    } = validarCadastro({
      tipo,
      nome,
      telefone,
      email,
      senha,
      confirmacao,
    });
    setErros(e);
    if (!valido) return;

    setCarregando(true);
    try {
      await cadastrar(dados);
      // Ao criar a conta o usuário já fica logado e a navegação troca sozinha.
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
          <Text style={styles.subtitulo}>
            {ehCliente
              ? 'Marque seus horários sem precisar mandar mensagem.'
              : 'Cadastre seu negócio e organize a agenda.'}
          </Text>
        </View>

        <Opcoes opcoes={TIPOS} valor={tipo} onChange={setTipo} />

        <Campo
          rotulo={ehCliente ? 'Seu nome' : 'Nome do negócio'}
          value={nome}
          onChangeText={setNome}
          placeholder={ehCliente ? 'Nome completo' : 'Ex.: Duarte Barbearia'}
          maxLength={60}
          erro={erros.nome}
        />
        {ehCliente && (
          <Campo
            rotulo="Telefone (WhatsApp)"
            value={telefone}
            onChangeText={(t) => setTelefone(formatarTelefone(t))}
            placeholder="(48) 99999-0000"
            keyboardType="phone-pad"
            erro={erros.telefone}
          />
        )}
        <Campo
          rotulo="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="voce@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
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
