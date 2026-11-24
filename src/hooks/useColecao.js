import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { auth } from '../config/firebase';
import { mensagemErroFirestore } from '../services/operacao';

/**
 * Assina uma lista do Firestore em tempo real e cancela a assinatura ao
 * desmontar a tela. `assinar(callback, aoErro)` deve devolver o unsubscribe.
 * `deps` funciona como no useEffect: quando muda, a assinatura é refeita.
 */
export function useColecao(assinar, deps) {
  const chave = JSON.stringify(deps);
  const [estado, setEstado] = useState({ itens: [], chave: null, erro: null });

  useEffect(() => {
    return assinar(
      (itens) => setEstado({ itens, chave, erro: null }),
      (erro) => {
        setEstado({ itens: [], chave, erro });
        // Ao sair da conta as escutas ainda ativas recebem "sem permissão": ignora.
        if (auth.currentUser) Alert.alert('Erro ao carregar', mensagemErroFirestore(erro));
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  // Enquanto os dados da chave atual não chegam, a tela mostra o carregamento.
  return { itens: estado.itens, carregando: estado.chave !== chave, erro: estado.erro };
}
