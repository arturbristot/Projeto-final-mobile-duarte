import {
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { inicioDoDia, somarDias } from '../utils/format';
import { STATUS, statusOcupaHorario } from '../utils/status';
import { encontrarConflito } from '../utils/validacao';
import { refColecao, refDocumento } from './firestore';

/*
 * Cada agendamento tem um "espelho" em usuarios/{barbeiro}/ocupados/{mesmo id}
 * com apenas { inicio, fim }. É por ele que o cliente descobre os horários
 * livres sem ver nome, telefone ou serviço de outros clientes.
 * Agendamento e espelho são sempre gravados juntos num batch (tudo ou nada).
 */

function converter(d) {
  const dados = d.data();
  return { id: d.id, ...dados, data: dados.data.toDate() };
}

function paraFirestore(dados) {
  return { ...dados, data: Timestamp.fromDate(dados.data) };
}

/** Grava ou apaga o espelho conforme o status ainda ocupar o horário. */
function sincronizarOcupado(lote, uid, id, agendamento) {
  const ref = refDocumento(uid, 'ocupados', id);
  if (!statusOcupaHorario(agendamento.status)) {
    lote.delete(ref);
    return;
  }
  const fim = new Date(agendamento.data.getTime() + agendamento.duracaoMin * 60_000);
  lote.set(ref, { inicio: Timestamp.fromDate(agendamento.data), fim: Timestamp.fromDate(fim) });
}

function intervaloDoDia(dia) {
  const inicio = inicioDoDia(dia);
  return [Timestamp.fromDate(inicio), Timestamp.fromDate(somarDias(inicio, 1))];
}

function queryPeriodo(uid, inicio, fim) {
  return query(
    refColecao(uid, 'agendamentos'),
    where('data', '>=', Timestamp.fromDate(inicio)),
    where('data', '<', Timestamp.fromDate(fim)),
    orderBy('data'),
  );
}

function queryDoDia(uid, dia) {
  const inicio = inicioDoDia(dia);
  return queryPeriodo(uid, inicio, somarDias(inicio, 1));
}

// ---------- Leitura (barbeiro) ----------

export async function buscarAgendamento(uid, id) {
  const snap = await getDoc(refDocumento(uid, 'agendamentos', id));
  return snap.exists() ? converter(snap) : null;
}

/** Escuta em tempo real os agendamentos de um dia, ordenados por horário. */
export function observarAgendamentosDoDia(uid, dia, callback, aoErro) {
  return onSnapshot(queryDoDia(uid, dia), (snap) => callback(snap.docs.map(converter)), aoErro);
}

/** Pedidos feitos pelos clientes no app que aguardam o barbeiro. */
export function observarPendentes(uid, callback, aoErro) {
  const q = query(refColecao(uid, 'agendamentos'), where('status', '==', STATUS.PENDENTE));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(converter).sort((a, b) => a.data - b.data)),
    aoErro,
  );
}

export async function buscarAgendamentosDoPeriodo(uid, inicio, fim) {
  const snap = await getDocs(queryPeriodo(uid, inicio, fim));
  return snap.docs.map(converter);
}

async function buscarPorCampo(uid, campo, valor) {
  const q = query(refColecao(uid, 'agendamentos'), where(campo, '==', valor));
  const snap = await getDocs(q);
  return snap.docs.map(converter);
}

/** Histórico de um cliente (mais recentes primeiro). Ordenado no app para dispensar índice composto. */
export async function buscarHistoricoCliente(uid, clienteId) {
  const lista = await buscarPorCampo(uid, 'clienteId', clienteId);
  return lista.sort((a, b) => b.data.getTime() - a.data.getTime());
}

/**
 * Agendamentos ainda a acontecer (pendentes ou agendados) de um cliente ou serviço.
 * `campo` é 'clienteId' ou 'servicoId'.
 */
export async function buscarAgendamentosFuturos(uid, campo, id) {
  const agora = Date.now();
  const lista = await buscarPorCampo(uid, campo, id);
  return lista.filter(
    (a) =>
      (a.status === STATUS.AGENDADO || a.status === STATUS.PENDENTE) && a.data.getTime() >= agora,
  );
}

/** Retorna o primeiro agendamento ativo que conflita com o horário informado, se houver. */
export async function buscarConflito(uid, inicio, duracaoMin, ignorarId) {
  const snap = await getDocs(queryDoDia(uid, inicio));
  return encontrarConflito(snap.docs.map(converter), inicio, duracaoMin, ignorarId);
}

// ---------- Escrita (barbeiro) ----------

export function criarAgendamento(uid, dados) {
  const ref = doc(refColecao(uid, 'agendamentos'));
  const lote = writeBatch(db);
  lote.set(ref, paraFirestore(dados));
  sincronizarOcupado(lote, uid, ref.id, dados);
  return lote.commit();
}

export function atualizarAgendamento(uid, id, dados) {
  const lote = writeBatch(db);
  lote.update(refDocumento(uid, 'agendamentos', id), paraFirestore(dados));
  sincronizarOcupado(lote, uid, id, dados);
  return lote.commit();
}

/** Muda o status (ex.: concluir com a forma de pagamento, aceitar ou recusar um pedido). */
export function alterarStatus(uid, agendamento, status, extras = {}) {
  const lote = writeBatch(db);
  lote.update(refDocumento(uid, 'agendamentos', agendamento.id), { status, ...extras });
  sincronizarOcupado(lote, uid, agendamento.id, { ...agendamento, status });
  return lote.commit();
}

export function excluirAgendamento(uid, id) {
  const lote = writeBatch(db);
  lote.delete(refDocumento(uid, 'agendamentos', id));
  lote.delete(refDocumento(uid, 'ocupados', id));
  return lote.commit();
}

/**
 * Recria os espelhos dos agendamentos futuros. Roda quando o barbeiro abre o
 * app, para cobrir agendamentos criados antes de existir a área do cliente.
 */
export async function sincronizarHorariosOcupados(uid) {
  const agora = new Date();
  const snap = await getDocs(
    query(refColecao(uid, 'agendamentos'), where('data', '>=', Timestamp.fromDate(agora))),
  );
  if (snap.empty) return;
  const lote = writeBatch(db);
  snap.docs.map(converter).forEach((a) => sincronizarOcupado(lote, uid, a.id, a));
  await lote.commit();
}

// ---------- Área do cliente ----------

/** Horários ocupados da barbearia num dia, como { inicio: Date, fim: Date }. */
export async function buscarOcupadosDoDia(barbeiroUid, dia) {
  const [inicio, fim] = intervaloDoDia(dia);
  const q = query(
    refColecao(barbeiroUid, 'ocupados'),
    where('inicio', '>=', inicio),
    where('inicio', '<', fim),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ inicio: d.data().inicio.toDate(), fim: d.data().fim.toDate() }));
}

/** O cliente pede um horário: entra como "pendente" até o barbeiro aceitar. */
export function solicitarAgendamento(barbeiroUid, dados) {
  return criarAgendamento(barbeiroUid, { ...dados, status: STATUS.PENDENTE, origem: 'app' });
}

export function observarMeusAgendamentos(barbeiroUid, clienteUid, callback, aoErro) {
  const q = query(refColecao(barbeiroUid, 'agendamentos'), where('clienteUid', '==', clienteUid));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(converter).sort((a, b) => b.data - a.data)),
    aoErro,
  );
}

/** O cliente desiste: o horário volta a ficar livre na mesma gravação. */
export function cancelarPeloCliente(barbeiroUid, agendamento) {
  const lote = writeBatch(db);
  lote.update(refDocumento(barbeiroUid, 'agendamentos', agendamento.id), {
    status: STATUS.CANCELADO,
  });
  lote.delete(refDocumento(barbeiroUid, 'ocupados', agendamento.id));
  return lote.commit();
}
