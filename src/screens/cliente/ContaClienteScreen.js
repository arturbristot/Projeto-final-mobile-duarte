import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { updateProfile } from 'firebase/auth';
import { Botao } from '../../components/Botao';
import { Campo } from '../../components/Campo';
import { TelaFormulario } from '../../components/TelaFormulario';
import { useAuth, useUid } from '../../contexts/AuthContext';
import { avisarErro, avisarSePendente, gravar } from '../../services/operacao';
import { salvarPerfil } from '../../services/perfil';
import { colors, spacing } from '../../theme';
import { formatarTelefone } from '../../utils/format';
import { LIMITES, telefoneValido } from '../../utils/validacao';

export default function ContaClienteScreen() {
  const uid = useUid();
  const { user, perfil, sair } = useAuth();
  const [nome, setNome] = useState(perfil?.nome ?? '');
  const [telefone, setTelefone] = useState(perfil?.telefone ?? '');
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    const e = {};
    if (nome.trim().length < LIMITES.nomeMin) e.nome = 'Informe seu nome.';
    if (!telefoneValido(telefone)) e.telefone = 'Informe o telefone com DDD.';
    setErros(e);
    if (Object.keys(e).length) return;

    setSalvando(true);
    try {
      const resultado = await gravar(() => salvarPerfil(uid, { nome: nome.trim(), telefone }));
      if (user) updateProfile(user, { displayName: nome.trim() }).catch(() => {});
      if (resultado === 'salvo') Alert.alert('Pronto!', 'Seus dados foram atualizados.');
      else avisarSePendente(resultado);
    } catch (erro) {
      avisarErro(erro);
    } finally {
      setSalvando(false);
    }
  }

  function handleSair() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: sair },
    ]);
  }

  return (
    <TelaFormulario>
      <Text style={styles.email}>Conectado como {user?.email}</Text>
      <Campo
        rotulo="Seu nome"
        value={nome}
        onChangeText={setNome}
        maxLength={LIMITES.nomeMax}
        erro={erros.nome}
      />
      <Campo
        rotulo="Telefone (WhatsApp)"
        value={telefone}
        onChangeText={(t) => setTelefone(formatarTelefone(t))}
        keyboardType="phone-pad"
        placeholder="(48) 99999-0000"
        erro={erros.telefone}
      />
      <Text style={styles.dica}>
        A barbearia usa seu telefone para confirmar e lembrar dos horários pelo WhatsApp.
      </Text>
      <View style={styles.acoes}>
        <Botao titulo="Salvar" icone="checkmark" onPress={handleSalvar} carregando={salvando} />
        <Botao
          titulo="Sair da conta"
          icone="log-out-outline"
          variante="perigo"
          onPress={handleSair}
        />
      </View>
    </TelaFormulario>
  );
}

const styles = StyleSheet.create({
  email: { color: colors.textMuted, marginBottom: spacing.md },
  dica: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  acoes: { gap: spacing.sm },
});
