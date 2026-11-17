import { getDoc, setDoc } from 'firebase/firestore';
import { refUsuario } from './firestore';

export async function buscarEstabelecimento(uid) {
  const snap = await getDoc(refUsuario(uid));
  return snap.exists() ? snap.data() : null;
}

export function salvarEstabelecimento(uid, dados) {
  // Firestore não aceita `undefined`; remove campos vazios antes de salvar.
  const limpo = Object.fromEntries(Object.entries(dados).filter(([, v]) => v !== undefined));
  return setDoc(refUsuario(uid), limpo, { merge: true });
}
