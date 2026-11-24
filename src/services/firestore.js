import { collection, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Todos os dados ficam isolados por usuário:
 *   usuarios/{uid}                      -> dados do estabelecimento
 *   usuarios/{uid}/servicos/{id}
 *   usuarios/{uid}/clientes/{id}
 *   usuarios/{uid}/agendamentos/{id}
 * As regras de segurança (firestore.rules) garantem que cada usuário
 * só acessa os próprios documentos e validam os dados gravados.
 */
export function refUsuario(uid) {
  return doc(db, 'usuarios', uid);
}

export function refColecao(uid, nome) {
  return collection(db, 'usuarios', uid, nome);
}

export function refDocumento(uid, nome, id) {
  return doc(db, 'usuarios', uid, nome, id);
}

/** Busca um documento de uma subcoleção. Retorna null se ele não existir mais. */
export async function buscarDocumento(uid, nome, id) {
  const snap = await getDoc(refDocumento(uid, nome, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
