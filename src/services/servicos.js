import { addDoc, deleteDoc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { refColecao, refDocumento } from './firestore';

export function observarServicos(uid, callback, aoErro) {
  const q = query(refColecao(uid, 'servicos'), orderBy('nome'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    aoErro,
  );
}

export function criarServico(uid, dados) {
  return addDoc(refColecao(uid, 'servicos'), dados);
}

export function atualizarServico(uid, id, dados) {
  return updateDoc(refDocumento(uid, 'servicos', id), { ...dados });
}

export function excluirServico(uid, id) {
  return deleteDoc(refDocumento(uid, 'servicos', id));
}
