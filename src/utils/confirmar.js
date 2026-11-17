import { Alert } from 'react-native';

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
          aoConfirmar().catch(() =>
            Alert.alert('Erro', 'Não foi possível excluir. Tente novamente.'),
          );
        },
      },
    ],
  );
}
