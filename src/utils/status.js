/** Situações possíveis de um agendamento. */
export const STATUS = {
  PENDENTE: 'pendente', // pedido feito pelo cliente no app, aguardando o barbeiro
  AGENDADO: 'agendado',
  CONCLUIDO: 'concluido',
  CANCELADO: 'cancelado',
  RECUSADO: 'recusado', // pedido do cliente recusado pelo barbeiro
};

export const ROTULO_STATUS = {
  pendente: 'Aguardando confirmação',
  agendado: 'Agendado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  recusado: 'Recusado',
};

/** Status que ainda ocupam o horário na agenda. */
export function statusOcupaHorario(status) {
  return status === STATUS.PENDENTE || status === STATUS.AGENDADO || status === STATUS.CONCLUIDO;
}

/** O cliente só pode cancelar o que ainda não aconteceu. */
export function clientePodeCancelar(agendamento, agora = new Date()) {
  const aberto = agendamento.status === STATUS.PENDENTE || agendamento.status === STATUS.AGENDADO;
  return aberto && agendamento.data.getTime() > agora.getTime();
}

export const FORMAS_PAGAMENTO = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao: 'Cartão',
};
