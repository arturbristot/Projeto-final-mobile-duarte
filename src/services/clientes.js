import {
  addDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { buscarAgendamentosFuturos } from './agendamentos';
import { refColecao, refDocumento } from './firestore';

export function observarClientes(uid, callback, aoErro) {
  const q = query(refColecao(uid, 'clientes'), orderBy('nome'));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    aoErro,
  );
}

/** Outro cliente com o mesmo telefone, se existir (para evitar cadastro duplicado). */
export async function buscarClientePorTelefone(uid, telefone, ignorarId) {
  const q = query(refColecao(uid, 'clientes'), where('telefone', '==', telefone));
  const snap = await getDocs(q);
  const outro = snap.docs.find((d) => d.id !== ignorarId);
  return outro ? { id: outro.id, ...outro.data() } : null;
}

export function criarCliente(uid, dados) {
  return addDoc(refColecao(uid, 'clientes'), dados);
}

/**
 * Atualiza o cliente e, na mesma gravação atômica (batch), o nome e o
 * telefone guardados nos agendamentos futuros dele, para a agenda e o
 * lembrete de WhatsApp não ficarem com dados antigos.
 */
export async function atualizarCliente(uid, id, dados) {
  let futuros = [];
  try {
    futuros = await buscarAgendamentosFuturos(uid, 'clienteId', id);
  } catch {
    // Sem conexão para consultar: atualiza só o cadastro do cliente.
  }

  const lote = writeBatch(db);
  lote.update(refDocumento(uid, 'clientes', id), { ...dados });
  futuros.forEach((a) =>
    lote.update(refDocumento(uid, 'agendamentos', a.id), {
      clienteNome: dados.nome,
      clienteTelefone: dados.telefone,
    }),
  );
  return lote.commit();
}

export function excluirCliente(uid, id) {
  return deleteDoc(refDocumento(uid, 'clientes', id));
}
