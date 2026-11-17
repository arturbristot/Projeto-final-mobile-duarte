import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { salvarEstabelecimento } from '../services/estabelecimento';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Dispara ao abrir o app (sessão salva) e a cada login/logout.
    return onAuthStateChanged(auth, (usuario) => {
      setUser(usuario);
      setCarregando(false);
    });
  }, []);

  async function entrar(email, senha) {
    await signInWithEmailAndPassword(auth, email.trim(), senha);
  }

  async function cadastrar(nomeNegocio, email, senha) {
    const { user: novo } = await createUserWithEmailAndPassword(auth, email.trim(), senha);
    await updateProfile(novo, { displayName: nomeNegocio });
    await salvarEstabelecimento(novo.uid, { nome: nomeNegocio, endereco: '', telefone: '' });
  }

  async function recuperarSenha(email) {
    await sendPasswordResetEmail(auth, email.trim());
  }

  async function sair() {
    await signOut(auth);
  }

  async function obterToken() {
    return auth.currentUser ? auth.currentUser.getIdToken() : null;
  }

  return (
    <AuthContext.Provider
      value={{ user, carregando, entrar, cadastrar, recuperarSenha, sair, obterToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}

/** Atalho para telas que só existem com usuário logado. */
export function useUid() {
  const { user } = useAuth();
  if (!user) throw new Error('Usuário não autenticado');
  return user.uid;
}

/** Traduz os códigos de erro do Firebase Auth para mensagens amigáveis. */
export function mensagemErroAuth(erro) {
  const code = erro?.code ?? '';
  const mensagens = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente de novo.',
    'auth/network-request-failed': 'Sem conexão com a internet.',
    'auth/configuration-not-found': 'Login por e-mail/senha não está ativado no Firebase.',
    'auth/operation-not-allowed': 'Login por e-mail/senha não está ativado no Firebase.',
    'auth/invalid-api-key': 'Chave do Firebase inválida. Confira o arquivo .env.',
    'permission-denied': 'Sem permissão no banco de dados. Confira o Firestore e as regras.',
  };
  if (!mensagens[code]) console.warn('Erro não tratado:', code, erro?.message);
  return mensagens[code] ?? 'Não foi possível concluir. Tente novamente.';
}
