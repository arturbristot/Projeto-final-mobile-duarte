import { Alert, Linking } from 'react-native';
import { apenasDigitos, formatarDataLonga, formatarHora } from './format';

/** Abre o WhatsApp com uma mensagem de lembrete pronta para o cliente. */
export async function enviarLembreteWhatsApp(agendamento, nomeNegocio) {
  const telefone = apenasDigitos(agendamento.clienteTelefone);
  if (telefone.length < 10) {
    Alert.alert('Telefone inválido', 'Cadastre o telefone do cliente com DDD.');
    return;
  }
  const primeiroNome = agendamento.clienteNome.split(' ')[0];
  const mensagem =
    `Olá, ${primeiroNome}! Passando para lembrar do seu horário de ${agendamento.servicoNome} ` +
    `na ${nomeNegocio}, ${formatarDataLonga(agendamento.data)} às ${formatarHora(agendamento.data)}. ` +
    'Podemos confirmar?';
  const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
  }
}
