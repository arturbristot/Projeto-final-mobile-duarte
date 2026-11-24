import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { refColecao, refDocumento } from './firestore';

/** Despesas do negócio em usuarios/{uid}/despesas: { descricao, valor, categoria, data }. */

function converter(d) {
  const dados = d.data();
  return { id: d.id, ...dados, data: dados.data.toDate() };
}

function paraFirestore(dados) {
  return { ...dados, data: Timestamp.fromDate(dados.data) };
}

export async function buscarDespesasDoPeriodo(uid, inicio, fim) {
  const q = query(
    refColecao(uid, 'despesas'),
    where('data', '>=', Timestamp.fromDate(inicio)),
    where('data', '<', Timestamp.fromDate(fim)),
    orderBy('data', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(converter);
}

export async function buscarDespesa(uid, id) {
  const snap = await getDoc(refDocumento(uid, 'despesas', id));
  return snap.exists() ? converter(snap) : null;
}

export function criarDespesa(uid, dados) {
  return addDoc(refColecao(uid, 'despesas'), paraFirestore(dados));
}

export function atualizarDespesa(uid, id, dados) {
  return updateDoc(refDocumento(uid, 'despesas', id), paraFirestore(dados));
}

export function excluirDespesa(uid, id) {
  return deleteDoc(refDocumento(uid, 'despesas', id));
}
