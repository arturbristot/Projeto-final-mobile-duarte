import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { getDoc } from 'firebase/firestore';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { Cartao } from '../components/Cartao';
import { TelaFormulario } from '../components/TelaFormulario';
import { useUid } from '../contexts/AuthContext';
import { buscarHistoricoCliente } from '../services/agendamentos';
import { atualizarCliente, criarCliente, excluirCliente } from '../services/clientes';
import { refDocumento } from '../services/firestore';
import { colors, fonts, spacing } from '../theme';
import { confirmarExclusao } from '../utils/confirmar';
import { apenasDigitos, formatarDataCurta, formatarMoeda, formatarTelefone } from '../utils/format';

const rotuloStatus = { agendado: 'Agendado', concluido: 'Concluído', cancelado: 'Cancelado' };

export default function ClienteFormScreen({ navigation, route }) {
  const uid = useUid();
  const { clienteId } = route.params;
  const editando = Boolean(clienteId);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [historico, setHistorico] = useState([]);
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: editando ? 'Cliente' : 'Novo cliente' });
  }, [navigation, editando]);

  useEffect(() => {
    if (!clienteId) return;
    getDoc(refDocumento(uid, 'clientes', clienteId)).then((snap) => {
      const c = snap.data();
      if (!c) return;
      setNome(c.nome);
      setTelefone(c.telefone);
      setObservacoes(c.observacoes ?? '');
    });
    buscarHistoricoCliente(uid, clienteId).then(setHistorico);
  }, [uid, clienteId]);

  function validar() {
    const e = {};
    if (nome.trim().length < 2) e.nome = 'Informe o nome do cliente.';
    if (apenasDigitos(telefone).length < 10) e.telefone = 'Informe o telefone com DDD.';
    setErros(e);
    if (Object.keys(e).length) return null;
    return { nome: nome.trim(), telefone, observacoes: observacoes.trim() };
  }

  async function handleSalvar() {
    const dados = validar();
    if (!dados) return;
    setSalvando(true);
    try {
      if (clienteId) await atualizarCliente(uid, clienteId, dados);
      else await criarCliente(uid, dados);
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o cliente.');
      setSalvando(false);
    }
  }

  function handleExcluir() {
    if (!clienteId) return;
    confirmarExclusao(`o cliente "${nome}"`, async () => {
      await excluirCliente(uid, clienteId);
      navigation.goBack();
    });
  }

  const totalGasto = historico
    .filter((a) => a.status === 'concluido')
    .reduce((soma, a) => soma + a.preco, 0);

  return (
    <TelaFormulario>
      <Campo
        rotulo="Nome"
        value={nome}
        onChangeText={setNome}
        placeholder="Nome completo"
        erro={erros.nome}
      />
      <Campo
        rotulo="Telefone (WhatsApp)"
        value={telefone}
        onChangeText={(t) => setTelefone(formatarTelefone(t))}
        placeholder="(48) 99999-0000"
        keyboardType="phone-pad"
        erro={erros.telefone}
      />
      <Campo
        rotulo="Observações"
        value={observacoes}
        onChangeText={setObservacoes}
        placeholder="Preferências, alergias, etc."
        multiline
        style={styles.multilinha}
      />

      <View style={styles.acoes}>
        <Botao titulo="Salvar" icone="checkmark" onPress={handleSalvar} carregando={salvando} />
        {editando && (
          <Botao
            titulo="Novo agendamento"
            icone="calendar-outline"
            variante="secundario"
            onPress={() => navigation.navigate('AgendamentoForm', { clienteId })}
          />
        )}
        {editando && (
          <Botao
            titulo="Excluir cliente"
            icone="trash-outline"
            variante="perigo"
            onPress={handleExcluir}
          />
        )}
      </View>

      {editando && (
        <View style={styles.historico}>
          <Text style={styles.tituloSecao}>Histórico</Text>
          <Text style={styles.resumo}>
            {historico.length} atendimento(s) · {formatarMoeda(totalGasto)} em serviços concluídos
          </Text>
          {historico.map((a) => (
            <Cartao key={a.id}>
              <View style={styles.linha}>
                <Text style={styles.servico}>{a.servicoNome}</Text>
                <Text style={styles.data}>{formatarDataCurta(a.data)}</Text>
              </View>
              <Text style={styles.status}>
                {rotuloStatus[a.status]} · {formatarMoeda(a.preco)}
              </Text>
            </Cartao>
          ))}
        </View>
      )}
    </TelaFormulario>
  );
}

const styles = StyleSheet.create({
  multilinha: { minHeight: 90, textAlignVertical: 'top' },
  acoes: { gap: spacing.sm, marginTop: spacing.sm },
  historico: { marginTop: spacing.xl },
  tituloSecao: { fontSize: 20, fontFamily: fonts.titulo, color: colors.primary },
  resumo: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md, marginTop: 2 },
  linha: { flexDirection: 'row', justifyContent: 'space-between' },
  servico: { fontSize: 15, fontWeight: '600', color: colors.text },
  data: { fontSize: 14, color: colors.textMuted },
  status: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
