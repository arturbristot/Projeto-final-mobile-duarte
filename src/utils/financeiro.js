import { lerNumero } from './format';
import { FORMAS_PAGAMENTO, STATUS } from './status';

export const CATEGORIAS_DESPESA = [
  'Aluguel',
  'Produtos',
  'Contas',
  'Equipamentos',
  'Salários',
  'Outros',
];

export const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/** Primeiro instante do mês e primeiro instante do mês seguinte. */
export function intervaloDoMes(ano, mes) {
  return { inicio: new Date(ano, mes, 1), fim: new Date(ano, mes + 1, 1) };
}

function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}

/**
 * Resumo financeiro de um período.
 * Receita = atendimentos concluídos; lucro = receita - despesas.
 */
export function resumirFinanceiro({ agendamentos, despesas }) {
  const concluidos = agendamentos.filter((a) => a.status === STATUS.CONCLUIDO);
  const receita = concluidos.reduce((soma, a) => soma + a.preco, 0);
  const totalDespesas = despesas.reduce((soma, d) => soma + d.valor, 0);

  const porForma = Object.fromEntries(
    [...Object.keys(FORMAS_PAGAMENTO), 'naoInformado'].map((f) => [f, 0]),
  );
  concluidos.forEach((a) => {
    const forma = FORMAS_PAGAMENTO[a.formaPagamento] ? a.formaPagamento : 'naoInformado';
    porForma[forma] = arredondar(porForma[forma] + a.preco);
  });

  const servicos = new Map();
  concluidos.forEach((a) => {
    const atual = servicos.get(a.servicoNome) ?? { nome: a.servicoNome, total: 0, quantidade: 0 };
    atual.total = arredondar(atual.total + a.preco);
    atual.quantidade += 1;
    servicos.set(a.servicoNome, atual);
  });

  const porCategoria = {};
  despesas.forEach((d) => {
    porCategoria[d.categoria] = arredondar((porCategoria[d.categoria] ?? 0) + d.valor);
  });

  return {
    receita: arredondar(receita),
    despesas: arredondar(totalDespesas),
    lucro: arredondar(receita - totalDespesas),
    atendimentos: concluidos.length,
    ticketMedio: concluidos.length ? arredondar(receita / concluidos.length) : 0,
    porForma,
    porServico: [...servicos.values()].sort((a, b) => b.total - a.total),
    porCategoria,
  };
}

export function validarDespesa({ descricao, valor, categoria, data }) {
  const erros = {};
  const numero = lerNumero(valor);
  const limpa = descricao.trim();

  if (limpa.length < 2) erros.descricao = 'Descreva a despesa.';
  else if (limpa.length > 80) erros.descricao = 'Use no máximo 80 caracteres.';
  if (valor.trim() === '' || isNaN(numero) || numero <= 0)
    erros.valor = 'Informe um valor maior que zero.';
  else if (numero > 100000) erros.valor = 'Valor máximo de R$ 100.000.';
  if (!CATEGORIAS_DESPESA.includes(categoria)) erros.categoria = 'Escolha uma categoria.';
  if (!(data instanceof Date) || isNaN(data.getTime())) erros.data = 'Data inválida.';

  const valido = Object.keys(erros).length === 0;
  return {
    valido,
    erros,
    dados: valido ? { descricao: limpa, valor: arredondar(numero), categoria, data } : null,
  };
}
