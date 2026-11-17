import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Botao } from '../components/Botao';
import { SeletorDataHora } from '../components/SeletorDataHora';
import { SeletorItem } from '../components/SeletorItem';
import { TelaFormulario } from '../components/TelaFormulario';
import { useAuth, useUid } from '../contexts/AuthContext';
import { useColecao } from '../hooks/useColecao';
import {
  alterarStatus,
  atualizarAgendamento,
  buscarAgendamento,
  buscarConflito,
  criarAgendamento,
  excluirAgendamento,
} from '../services/agendamentos';
import { observarClientes } from '../services/clientes';
import { observarServicos } from '../services/servicos';
import { colors, radius, spacing } from '../theme';
import { confirmarExclusao } from '../utils/confirmar';
import { formatarHora, formatarMoeda } from '../utils/format';
import { enviarLembreteWhatsApp } from '../utils/whatsapp';

/** Próximo horário "redondo" (de 30 em 30 min) a partir de agora, no dia escolhido. */
function horarioSugerido(dia) {
  const agora = new Date();
  const data = dia ? new Date(dia) : new Date(agora);
  data.setHours(agora.getHours(), agora.getMinutes() < 30 ? 30 : 60, 0, 0);
  return data;
}

export default function AgendamentoFormScreen({ navigation, route }) {
  const uid = useUid();
  const { user } = useAuth();
  const { agendamentoId, dataInicial, clienteId: clienteInicial } = route.params;

  const { itens: clientes } = useColecao((cb, aoErro) => observarClientes(uid, cb, aoErro), [uid]);
  const { itens: servicos } = useColecao((cb, aoErro) => observarServicos(uid, cb, aoErro), [uid]);

  const [original, setOriginal] = useState(null);
  const [clienteId, setClienteId] = useState(clienteInicial);
  const [servicoId, setServicoId] = useState();
  const [data, setData] = useState(() => horarioSugerido(dataInicial));
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: agendamentoId ? 'Agendamento' : 'Novo agendamento' });
  }, [navigation, agendamentoId]);

  useEffect(() => {
    if (!agendamentoId) return;
    buscarAgendamento(uid, agendamentoId).then((a) => {
      if (!a) return;
      setOriginal(a);
      setClienteId(a.clienteId);
      setServicoId(a.servicoId);
      setData(a.data);
    });
  }, [uid, agendamentoId]);

  const cliente = clientes.find((c) => c.id === clienteId);
  const servico = servicos.find((s) => s.id === servicoId);

  async function handleSalvar() {
    const e = {};
    if (!cliente) e.cliente = 'Escolha o cliente.';
    if (!servico) e.servico = 'Escolha o serviço.';
    setErros(e);
    if (!cliente || !servico) return;

    setSalvando(true);
    try {
      const conflito = await buscarConflito(uid, data, servico.duracaoMin, agendamentoId);
      if (conflito) {
        setSalvando(false);
        Alert.alert(
          'Horário ocupado',
          `Já existe ${conflito.servicoNome} com ${conflito.clienteNome} às ${formatarHora(conflito.data)}. Deseja agendar mesmo assim?`,
          [
            { text: 'Escolher outro horário', style: 'cancel' },
            { text: 'Agendar mesmo assim', onPress: () => salvar(cliente, servico) },
          ],
        );
        return;
      }
      await salvar(cliente, servico);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o agendamento.');
      setSalvando(false);
    }
  }

  async function salvar(c, s) {
    setSalvando(true);
    const dados = {
      clienteId: c.id,
      clienteNome: c.nome,
      clienteTelefone: c.telefone,
      servicoId: s.id,
      servicoNome: s.nome,
      preco: s.preco,
      duracaoMin: s.duracaoMin,
      data,
      status: original?.status ?? 'agendado',
    };
    try {
      if (agendamentoId) await atualizarAgendamento(uid, agendamentoId, dados);
      else await criarAgendamento(uid, dados);
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o agendamento.');
      setSalvando(false);
    }
  }

  async function handleStatus(status) {
    if (!agendamentoId) return;
    await alterarStatus(uid, agendamentoId, status);
    navigation.goBack();
  }

  function handleExcluir() {
    if (!agendamentoId) return;
    confirmarExclusao('este agendamento', async () => {
      await excluirAgendamento(uid, agendamentoId);
      navigation.goBack();
    });
  }

  return (
    <TelaFormulario>
      <SeletorItem
        rotulo="Cliente"
        placeholder="Selecione o cliente"
        itens={clientes.map((c) => ({ id: c.id, titulo: c.nome, subtitulo: c.telefone }))}
        selecionadoId={clienteId}
        onSelecionar={setClienteId}
        erro={erros.cliente}
        textoVazio="Nenhum cliente. Cadastre na aba Clientes."
      />
      <SeletorItem
        rotulo="Serviço"
        placeholder="Selecione o serviço"
        itens={servicos.map((s) => ({
          id: s.id,
          titulo: s.nome,
          subtitulo: `${formatarMoeda(s.preco)} · ${s.duracaoMin} min`,
        }))}
        selecionadoId={servicoId}
        onSelecionar={setServicoId}
        erro={erros.servico}
        textoVazio="Nenhum serviço. Cadastre na aba Serviços."
      />

      <Text style={styles.rotulo}>Data e horário</Text>
      <SeletorDataHora valor={data} onChange={setData} />

      {servico && (
        <View style={styles.resumo}>
          <Text style={styles.resumoTexto}>
            {formatarHora(data)} até{' '}
            {formatarHora(new Date(data.getTime() + servico.duracaoMin * 60_000))}
          </Text>
          <Text style={styles.resumoValor}>{formatarMoeda(servico.preco)}</Text>
        </View>
      )}

      <View style={styles.acoes}>
        <Botao titulo="Salvar" icone="checkmark" onPress={handleSalvar} carregando={salvando} />

        {original && (
          <>
            <Botao
              titulo="Lembrar pelo WhatsApp"
              icone="logo-whatsapp"
              variante="secundario"
              onPress={() => enviarLembreteWhatsApp(original, user?.displayName ?? 'nosso salão')}
            />
            {original.status !== 'concluido' && (
              <Botao
                titulo="Marcar como concluído"
                icone="checkmark-done"
                variante="secundario"
                onPress={() => handleStatus('concluido')}
              />
            )}
            {original.status !== 'cancelado' && (
              <Botao
                titulo="Cliente cancelou"
                icone="close-circle-outline"
                variante="secundario"
                onPress={() => handleStatus('cancelado')}
              />
            )}
            {original.status !== 'agendado' && (
              <Botao
                titulo="Voltar para agendado"
                icone="refresh"
                variante="texto"
                onPress={() => handleStatus('agendado')}
              />
            )}
            <Botao
              titulo="Excluir agendamento"
              icone="trash-outline"
              variante="perigo"
              onPress={handleExcluir}
            />
          </>
        )}
      </View>
    </TelaFormulario>
  );
}

const styles = StyleSheet.create({
  rotulo: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  resumo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
  },
  resumoTexto: { fontSize: 15, color: colors.text },
  resumoValor: { fontSize: 15, fontWeight: '700', color: colors.primary },
  acoes: { gap: spacing.sm },
});
