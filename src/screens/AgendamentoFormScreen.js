import React, { useLayoutEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Botao } from '../components/Botao';
import { Carregando } from '../components/Carregando';
import { SeletorDataHora } from '../components/SeletorDataHora';
import { SeletorItem } from '../components/SeletorItem';
import { SeloStatus } from '../components/SeloStatus';
import { TelaFormulario } from '../components/TelaFormulario';
import { useAuth, useUid } from '../contexts/AuthContext';
import { useColecao } from '../hooks/useColecao';
import { useRegistro } from '../hooks/useRegistro';
import {
  alterarStatus,
  atualizarAgendamento,
  buscarAgendamento,
  buscarConflito,
  criarAgendamento,
  excluirAgendamento,
} from '../services/agendamentos';
import { observarClientes } from '../services/clientes';
import { avisarErro, avisarSePendente, gravar, perguntar } from '../services/operacao';
import { observarServicos } from '../services/servicos';
import { colors, radius, spacing } from '../theme';
import { confirmarExclusao } from '../utils/confirmar';
import { formatarDataLonga, formatarHora, formatarMoeda } from '../utils/format';
import { FORMAS_PAGAMENTO, STATUS } from '../utils/status';
import { enviarLembreteWhatsApp } from '../utils/whatsapp';

/** Próximo horário "redondo" (de 30 em 30 min) a partir de agora, no dia escolhido. */
function horarioSugerido(dia) {
  const agora = new Date();
  const data = dia ? new Date(dia) : new Date(agora);
  data.setHours(agora.getHours(), agora.getMinutes() < 30 ? 30 : 60, 0, 0);
  return data;
}

/** Pergunta a forma de pagamento; devolve a chave escolhida ou null se cancelar. */
function perguntarFormaPagamento() {
  return new Promise((resolve) => {
    Alert.alert(
      'Forma de pagamento',
      'Como o cliente pagou?',
      [
        ...Object.entries(FORMAS_PAGAMENTO).map(([chave, rotulo]) => ({
          text: rotulo,
          onPress: () => resolve(chave),
        })),
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

export default function AgendamentoFormScreen({ navigation, route }) {
  const uid = useUid();
  const { perfil } = useAuth();
  const { agendamentoId, dataInicial, clienteId: clienteInicial } = route.params;

  const clientesColecao = useColecao((cb, aoErro) => observarClientes(uid, cb, aoErro), [uid]);
  const servicosColecao = useColecao((cb, aoErro) => observarServicos(uid, cb, aoErro), [uid]);
  const clientes = clientesColecao.itens;
  const servicos = servicosColecao.itens;

  const [original, setOriginal] = useState(null);
  const [clienteId, setClienteId] = useState(clienteInicial);
  const [servicoId, setServicoId] = useState();
  const [data, setData] = useState(() => horarioSugerido(dataInicial));
  const [erros, setErros] = useState({});
  const [ocupado, setOcupado] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: agendamentoId ? 'Agendamento' : 'Novo agendamento' });
  }, [navigation, agendamentoId]);

  const carregandoRegistro = useRegistro({
    id: agendamentoId,
    buscar: (id) => buscarAgendamento(uid, id),
    aoCarregar: (a) => {
      setOriginal(a);
      setClienteId(a.clienteId);
      setServicoId(a.servicoId);
      setData(a.data);
    },
    navigation,
  });

  if (carregandoRegistro || clientesColecao.carregando || servicosColecao.carregando) {
    return <Carregando />;
  }

  const veioDoApp = original?.origem === 'app';
  // Pedidos feitos pelo cliente no app não estão no cadastro de clientes do barbeiro.
  const cliente = veioDoApp
    ? { id: original.clienteId, nome: original.clienteNome, telefone: original.clienteTelefone }
    : clientes.find((c) => c.id === clienteId);
  const servico = servicos.find((s) => s.id === servicoId);
  const nomeNegocio = perfil?.nome ?? 'nossa barbearia';

  async function handleSalvar() {
    const e = {};
    if (!cliente) e.cliente = 'Escolha o cliente.';
    if (!servico) e.servico = 'Escolha o serviço.';
    setErros(e);
    if (!cliente || !servico) return;

    setOcupado(true);
    try {
      const mudouHorario = !original || original.data.getTime() !== data.getTime();
      if (mudouHorario && data < new Date()) {
        const ok = await perguntar(
          'Horário no passado',
          `${formatarDataLonga(data)} às ${formatarHora(data)} já passou. Registrar mesmo assim?`,
          'Registrar',
        );
        if (!ok) return;
      }

      const conflito = await buscarConflito(uid, data, servico.duracaoMin, agendamentoId).catch(
        () => null, // sem conexão não dá para conferir; o barbeiro decide
      );
      if (conflito) {
        const ok = await perguntar(
          'Horário ocupado',
          `Já existe ${conflito.servicoNome} com ${conflito.clienteNome} às ${formatarHora(conflito.data)}. Agendar mesmo assim?`,
          'Agendar mesmo assim',
          'Escolher outro',
        );
        if (!ok) return;
      }

      const dados = {
        ...(original ?? {}),
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        clienteTelefone: cliente.telefone,
        servicoId: servico.id,
        servicoNome: servico.nome,
        preco: servico.preco,
        duracaoMin: servico.duracaoMin,
        data,
        status: original?.status ?? STATUS.AGENDADO,
      };
      delete dados.id;

      const resultado = await gravar(() =>
        agendamentoId
          ? atualizarAgendamento(uid, agendamentoId, dados)
          : criarAgendamento(uid, dados),
      );
      avisarSePendente(resultado);
      navigation.goBack();
    } catch (erro) {
      avisarErro(erro);
    } finally {
      setOcupado(false);
    }
  }

  async function mudarStatus(status, extras) {
    setOcupado(true);
    try {
      const resultado = await gravar(() => alterarStatus(uid, original, status, extras));
      avisarSePendente(resultado);
      navigation.goBack();
    } catch (erro) {
      avisarErro(erro);
      setOcupado(false);
    }
  }

  async function handleConcluir() {
    const formaPagamento = await perguntarFormaPagamento();
    if (formaPagamento) mudarStatus(STATUS.CONCLUIDO, { formaPagamento });
  }

  function handleExcluir() {
    confirmarExclusao('este agendamento', async () => {
      await gravar(() => excluirAgendamento(uid, agendamentoId));
      navigation.goBack();
    });
  }

  const status = original?.status;
  const estaAberto = status === STATUS.AGENDADO;

  return (
    <TelaFormulario>
      {original && (
        <View style={styles.situacao}>
          <SeloStatus status={status} style={styles.seloGrande} />
          {veioDoApp && <Text style={styles.origem}>Pedido feito pelo cliente no app</Text>}
          {original.formaPagamento && (
            <Text style={styles.origem}>Pago com {FORMAS_PAGAMENTO[original.formaPagamento]}</Text>
          )}
        </View>
      )}

      {veioDoApp ? (
        <View style={styles.clienteFixo}>
          <Text style={styles.rotulo}>Cliente</Text>
          <Text style={styles.clienteNome}>{cliente.nome}</Text>
          <Text style={styles.clienteTelefone}>{cliente.telefone}</Text>
        </View>
      ) : (
        <SeletorItem
          rotulo="Cliente"
          placeholder="Selecione o cliente"
          itens={clientes.map((c) => ({ id: c.id, titulo: c.nome, subtitulo: c.telefone }))}
          selecionadoId={clienteId}
          onSelecionar={setClienteId}
          erro={erros.cliente}
          textoVazio="Nenhum cliente. Cadastre na aba Clientes."
        />
      )}
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
        {status === STATUS.PENDENTE && (
          <>
            <Botao
              titulo="Aceitar pedido"
              icone="checkmark-circle-outline"
              onPress={() => mudarStatus(STATUS.AGENDADO)}
              carregando={ocupado}
            />
            <Botao
              titulo="Recusar pedido"
              icone="close-circle-outline"
              variante="perigo"
              onPress={() => mudarStatus(STATUS.RECUSADO)}
              desabilitado={ocupado}
            />
          </>
        )}

        <Botao
          titulo="Salvar alterações"
          icone="checkmark"
          variante={status === STATUS.PENDENTE ? 'secundario' : 'primario'}
          onPress={handleSalvar}
          carregando={ocupado && status !== STATUS.PENDENTE}
          desabilitado={ocupado}
        />

        {original && (
          <>
            {(estaAberto || status === STATUS.PENDENTE) && (
              <Botao
                titulo="Lembrar pelo WhatsApp"
                icone="logo-whatsapp"
                variante="secundario"
                onPress={() => enviarLembreteWhatsApp(original, nomeNegocio)}
              />
            )}
            {estaAberto && (
              <Botao
                titulo="Concluir e registrar pagamento"
                icone="cash-outline"
                variante="secundario"
                onPress={handleConcluir}
                desabilitado={ocupado}
              />
            )}
            {estaAberto && (
              <Botao
                titulo="Cliente cancelou"
                icone="close-circle-outline"
                variante="secundario"
                onPress={() => mudarStatus(STATUS.CANCELADO)}
                desabilitado={ocupado}
              />
            )}
            {(status === STATUS.CONCLUIDO ||
              status === STATUS.CANCELADO ||
              status === STATUS.RECUSADO) && (
              <Botao
                titulo="Voltar para agendado"
                icone="refresh"
                variante="texto"
                onPress={() => mudarStatus(STATUS.AGENDADO, { formaPagamento: null })}
                desabilitado={ocupado}
              />
            )}
            <Botao
              titulo="Excluir agendamento"
              icone="trash-outline"
              variante="perigo"
              onPress={handleExcluir}
              desabilitado={ocupado}
            />
          </>
        )}
      </View>
    </TelaFormulario>
  );
}

const styles = StyleSheet.create({
  situacao: { marginBottom: spacing.md },
  seloGrande: { fontSize: 15, marginTop: 0 },
  origem: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  rotulo: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  clienteFixo: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clienteNome: { fontSize: 16, color: colors.text, fontWeight: '600' },
  clienteTelefone: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
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
