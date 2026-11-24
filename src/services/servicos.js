import { addDoc, deleteDoc, onSnapshot, orderBy, query, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { buscarAgendamentosFuturos } from './agendamentos';
import { refColecao, refDocumento } from './firestore';

export function observarServicos(uid, callback, aoErro) {
  const q = query(refColecao(uid, 'servicos'), orderBy('nome'));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    aoErro,
  );
}

export function criarServico(uid, dados) {
  return addDoc(refColecao(uid, 'servicos'), dados);
}

/**
 * Atualiza o serviço e, na mesma gravação atômica, o nome e o preço nos
 * agendamentos futuros. A duração não é propagada para não criar conflitos
 * de horário em atendimentos já combinados com o cliente.
 */
export async function atualizarServico(uid, id, dados) {
  let futuros = [];
  try {
    futuros = await buscarAgendamentosFuturos(uid, 'servicoId', id);
  } catch {
    // Sem conexão para consultar: atualiza só o cadastro do serviço.
  }

  const lote = writeBatch(db);
  lote.update(refDocumento(uid, 'servicos', id), { ...dados });
  futuros.forEach((a) =>
    lote.update(refDocumento(uid, 'agendamentos', a.id), {
      servicoNome: dados.nome,
      preco: dados.preco,
    }),
  );
  return lote.commit();
}

export function excluirServico(uid, id) {
  return deleteDoc(refDocumento(uid, 'servicos', id));
}
