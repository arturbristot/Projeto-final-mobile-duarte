import { collection, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { FUNCIONAMENTO_PADRAO } from '../utils/horarios';
import { refUsuario } from './firestore';

/**
 * Perfil de cada conta, em usuarios/{uid}:
 * - barbearia: { tipo: 'barbeiro', nome, endereco, telefone, latitude, longitude, funcionamento }
 * - cliente:   { tipo: 'cliente', nome, telefone }
 * O perfil da barbearia é visível para clientes logados (para poderem marcar);
 * o do cliente, só para ele mesmo.
 */
export const TIPO = { BARBEIRO: 'barbeiro', CLIENTE: 'cliente' };

/** Firestore não aceita `undefined`: remove campos vazios antes de salvar. */
function semIndefinidos(dados) {
  return Object.fromEntries(Object.entries(dados).filter(([, v]) => v !== undefined));
}

export function observarPerfil(uid, callback, aoErro) {
  return onSnapshot(refUsuario(uid), callback, aoErro);
}

export function criarPerfilBarbearia(uid, nome) {
  return setDoc(refUsuario(uid), {
    tipo: TIPO.BARBEIRO,
    nome,
    endereco: '',
    telefone: '',
    funcionamento: FUNCIONAMENTO_PADRAO,
  });
}

export function criarPerfilCliente(uid, { nome, telefone }) {
  return setDoc(refUsuario(uid), { tipo: TIPO.CLIENTE, nome, telefone });
}

export function salvarPerfil(uid, dados) {
  return setDoc(refUsuario(uid), semIndefinidos(dados), { merge: true });
}

/** Barbearias cadastradas, para o cliente escolher onde marcar. */
export async function listarBarbearias() {
  const q = query(collection(db, 'usuarios'), where('tipo', '==', TIPO.BARBEIRO));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .map((b) => ({ ...b, funcionamento: b.funcionamento ?? FUNCIONAMENTO_PADRAO }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}
