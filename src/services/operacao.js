import { Alert } from 'react-native';

/** Tempo máximo esperando o servidor confirmar uma gravação. */
const TEMPO_LIMITE_MS = 8000;

export const RESULTADO = { SALVO: 'salvo', PENDENTE: 'pendente' };

/**
 * Executa uma gravação no Firestore sem travar a tela quando não há internet.
 *
 * O Firestore aplica a alteração no aparelho na hora (as listas já mostram o
 * dado novo) e só confirma a promessa quando o servidor responde. Sem conexão
 * isso nunca acontece, então, passado o tempo limite, consideramos a gravação
 * "pendente": ela fica na fila e é enviada sozinha quando a internet voltar.
 */
export async function gravar(operacao) {
  const promessa = operacao();
  let temporizador;
  const tempoEsgotado = new Promise((resolve) => {
    temporizador = setTimeout(() => resolve(RESULTADO.PENDENTE), TEMPO_LIMITE_MS);
  });

  try {
    return await Promise.race([promessa.then(() => RESULTADO.SALVO), tempoEsgotado]);
  } finally {
    clearTimeout(temporizador);
    // Se o servidor recusar depois do tempo limite, evita "unhandled rejection".
    promessa.catch((erro) => console.warn('Gravação recusada pelo servidor:', erro?.code));
  }
}

/** Traduz erros do Firestore para mensagens que o usuário entende. */
export function mensagemErroFirestore(erro) {
  switch (erro?.code) {
    case 'permission-denied':
      return 'O servidor recusou os dados. Confira as informações e tente de novo.';
    case 'unavailable':
      return 'Servidor indisponível. Verifique sua conexão.';
    case 'not-found':
      return 'Este registro não existe mais. Ele pode ter sido excluído.';
    default:
      return 'Não foi possível concluir. Tente novamente.';
  }
}

export function avisarErro(erro) {
  Alert.alert('Erro', mensagemErroFirestore(erro));
}

/** Avisa quando a gravação ficou na fila por falta de internet. */
export function avisarSePendente(resultado) {
  if (resultado === RESULTADO.PENDENTE) {
    Alert.alert(
      'Sem conexão',
      'A alteração foi salva no aparelho e será enviada quando a internet voltar.',
    );
  }
}

/** Pergunta algo ao usuário e devolve true se ele confirmar. */
export function perguntar(titulo, mensagem, textoConfirmar, textoCancelar = 'Cancelar') {
  return new Promise((resolve) => {
    Alert.alert(
      titulo,
      mensagem,
      [
        { text: textoCancelar, style: 'cancel', onPress: () => resolve(false) },
        { text: textoConfirmar, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
