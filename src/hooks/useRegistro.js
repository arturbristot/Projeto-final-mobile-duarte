import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { mensagemErroFirestore } from '../services/operacao';

/**
 * Carrega um registro para edição.
 * - `id` vazio: formulário de cadastro, não carrega nada.
 * - Registro não encontrado (excluído em outro aparelho) ou erro: avisa e volta.
 * `aoCarregar` recebe o registro para preencher os campos do formulário.
 */
export function useRegistro({ id, buscar, aoCarregar, navigation }) {
  const [carregando, setCarregando] = useState(Boolean(id));

  useEffect(() => {
    if (!id) return;
    let ativo = true;

    buscar(id)
      .then((registro) => {
        if (!ativo) return;
        if (!registro) {
          Alert.alert(
            'Não encontrado',
            'Este registro não existe mais. Ele pode ter sido excluído.',
          );
          navigation.goBack();
          return;
        }
        aoCarregar(registro);
        setCarregando(false);
      })
      .catch((erro) => {
        if (!ativo) return;
        Alert.alert('Erro', mensagemErroFirestore(erro));
        navigation.goBack();
      });

    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return carregando;
}
