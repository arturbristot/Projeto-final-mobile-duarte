import { addDoc, deleteDoc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { refColecao, refDocumento } from './firestore';

export function observarClientes(uid, callback, aoErro) {
  const q = query(refColecao(uid, 'clientes'), orderBy('nome'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    aoErro,
  );
}

export function criarCliente(uid, dados) {
  return addDoc(refColecao(uid, 'clientes'), dados);
}

export function atualizarCliente(uid, id, dados) {
  return updateDoc(refDocumento(uid, 'clientes', id), { ...dados });
}

export function excluirCliente(uid, id) {
  return deleteDoc(refDocumento(uid, 'clientes', id));
}
