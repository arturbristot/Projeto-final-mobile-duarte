import React, { useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { Carregando } from '../components/Carregando';
import { Cartao } from '../components/Cartao';
import { TelaFormulario } from '../components/TelaFormulario';
import { useUid } from '../contexts/AuthContext';
import { useRegistro } from '../hooks/useRegistro';
import { buscarAgendamentosFuturos, buscarHistoricoCliente } from '../services/agendamentos';
import {
  atualizarCliente,
  buscarClientePorTelefone,
  criarCliente,
  excluirCliente,
} from '../services/clientes';
import { buscarDocumento } from '../services/firestore';
import { avisarErro, avisarSePendente, gravar } from '../services/operacao';
import { colors, fonts, spacing } from '../theme';
import { avisarExclusaoBloqueada, confirmarExclusao } from '../utils/confirmar';
import { formatarDataCurta, formatarMoeda, formatarTelefone } from '../utils/format';
import { ROTULO_STATUS, STATUS } from '../utils/status';
import { LIMITES, validarCliente } from '../utils/validacao';

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

  const carregando = useRegistro({
    id: clienteId,
    buscar: (id) => buscarDocumento(uid, 'clientes', id),
    aoCarregar: (c) => {
      setNome(c.nome);
      setTelefone(c.telefone);
      setObservacoes(c.observacoes ?? '');
    },
    navigation,
  });

  useEffect(() => {
    if (!clienteId) return;
    // O histórico é complementar: se falhar, o formulário continua utilizável.
    buscarHistoricoCliente(uid, clienteId)
      .then(setHistorico)
      .catch(() => setHistorico([]));
  }, [uid, clienteId]);

  async function handleSalvar() {
    const { valido, erros: e, dados } = validarCliente({ nome, telefone, observacoes });
    setErros(e);
    if (!valido) return;

    setSalvando(true);
    try {
      const repetido = await buscarClientePorTelefone(uid, dados.telefone, clienteId).catch(
        () => null, // sem conexão: não impede o cadastro
      );
      if (repetido) {
        setErros({ telefone: `Este telefone já é do cliente ${repetido.nome}.` });
        setSalvando(false);
        return;
      }

      const resultado = await gravar(() =>
        clienteId ? atualizarCliente(uid, clienteId, dados) : criarCliente(uid, dados),
      );
      avisarSePendente(resultado);
      navigation.goBack();
    } catch (erro) {
      avisarErro(erro);
      setSalvando(false);
    }
  }

  async function handleExcluir() {
    try {
      const futuros = await buscarAgendamentosFuturos(uid, 'clienteId', clienteId);
      if (futuros.length) {
        avisarExclusaoBloqueada(`O cliente ${nome}`, futuros.length);
        return;
      }
    } catch (erro) {
      avisarErro(erro);
      return;
    }
    confirmarExclusao(`o cliente "${nome}"`, async () => {
      await gravar(() => excluirCliente(uid, clienteId));
      navigation.goBack();
    });
  }

  if (carregando) return <Carregando />;

  const totalGasto = historico
    .filter((a) => a.status === STATUS.CONCLUIDO)
    .reduce((soma, a) => soma + a.preco, 0);

  return (
    <TelaFormulario>
      <Campo
        rotulo="Nome"
        value={nome}
        onChangeText={setNome}
        placeholder="Nome completo"
        maxLength={LIMITES.nomeMax}
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
        maxLength={LIMITES.observacoesMax}
        style={styles.multilinha}
        erro={erros.observacoes}
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
                {ROTULO_STATUS[a.status]} · {formatarMoeda(a.preco)}
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
