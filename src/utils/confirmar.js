import { Alert } from 'react-native';
import { avisarErro } from '../services/operacao';

/** Pede confirmação antes de uma ação destrutiva (ex.: excluir). */
export function confirmarExclusao(descricao, aoConfirmar) {
  Alert.alert(
    'Excluir',
    `Tem certeza que deseja excluir ${descricao}? Essa ação não pode ser desfeita.`,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          aoConfirmar().catch(avisarErro);
        },
      },
    ],
  );
}

/** Explica por que um item não pode ser excluído enquanto tiver horários marcados. */
export function avisarExclusaoBloqueada(item, quantidade) {
  Alert.alert(
    'Não é possível excluir',
    `${item} tem ${quantidade} horário(s) marcado(s). Cancele ou conclua esses horários antes de excluir.`,
  );
}
