import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { inicioDoDia, somarDias } from '../utils/format';
import { refColecao, refDocumento } from './firestore';

function converter(d) {
  const dados = d.data();
  return { id: d.id, ...dados, data: dados.data.toDate() };
}

export async function buscarAgendamento(uid, id) {
  const snap = await getDoc(refDocumento(uid, 'agendamentos', id));
  return snap.exists() ? converter(snap) : null;
}

function paraFirestore(dados) {
  return { ...dados, data: Timestamp.fromDate(dados.data) };
}

function queryDoDia(uid, dia) {
  const inicio = inicioDoDia(dia);
  return query(
    refColecao(uid, 'agendamentos'),
    where('data', '>=', Timestamp.fromDate(inicio)),
    where('data', '<', Timestamp.fromDate(somarDias(inicio, 1))),
    orderBy('data'),
  );
}

/** Escuta em tempo real os agendamentos de um dia, ordenados por horário. */
export function observarAgendamentosDoDia(uid, dia, callback, aoErro) {
  return onSnapshot(queryDoDia(uid, dia), (snap) => callback(snap.docs.map(converter)), aoErro);
}

/** Histórico de um cliente (mais recentes primeiro). Ordenado no app para dispensar índice composto. */
export async function buscarHistoricoCliente(uid, clienteId) {
  const q = query(refColecao(uid, 'agendamentos'), where('clienteId', '==', clienteId));
  const snap = await getDocs(q);
  return snap.docs.map(converter).sort((a, b) => b.data.getTime() - a.data.getTime());
}

/** Retorna o primeiro agendamento ativo que conflita com o horário informado, se houver. */
export async function buscarConflito(uid, inicio, duracaoMin, ignorarId) {
  const fim = new Date(inicio.getTime() + duracaoMin * 60_000);
  const snap = await getDocs(queryDoDia(uid, inicio));
  return snap.docs.map(converter).find((a) => {
    if (a.id === ignorarId || a.status === 'cancelado') return false;
    const aFim = new Date(a.data.getTime() + a.duracaoMin * 60_000);
    return inicio < aFim && a.data < fim;
  });
}

export function criarAgendamento(uid, dados) {
  return addDoc(refColecao(uid, 'agendamentos'), paraFirestore(dados));
}

export function atualizarAgendamento(uid, id, dados) {
  return updateDoc(refDocumento(uid, 'agendamentos', id), paraFirestore(dados));
}

export function alterarStatus(uid, id, status) {
  return updateDoc(refDocumento(uid, 'agendamentos', id), { status });
}

export function excluirAgendamento(uid, id) {
  return deleteDoc(refDocumento(uid, 'agendamentos', id));
}
