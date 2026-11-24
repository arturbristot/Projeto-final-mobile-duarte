import { intervaloDoMes, resumirFinanceiro, validarDespesa } from '../src/utils/financeiro';
import { clientePodeCancelar } from '../src/utils/status';

const agendamento = (status, preco, extras = {}) => ({
  status,
  preco,
  servicoNome: 'Corte',
  ...extras,
});

describe('resumirFinanceiro', () => {
  const agendamentos = [
    agendamento('concluido', 40, { formaPagamento: 'pix' }),
    agendamento('concluido', 30, { formaPagamento: 'dinheiro', servicoNome: 'Barba' }),
    agendamento('concluido', 40, { formaPagamento: 'pix' }),
    agendamento('concluido', 25),
    agendamento('agendado', 100),
    agendamento('cancelado', 100),
  ];
  const despesas = [
    { valor: 50, categoria: 'Produtos' },
    { valor: 20.5, categoria: 'Contas' },
  ];

  const r = resumirFinanceiro({ agendamentos, despesas });

  it('soma só atendimentos concluídos como receita', () => {
    expect(r.receita).toBe(135);
    expect(r.atendimentos).toBe(4);
    expect(r.ticketMedio).toBe(33.75);
  });

  it('calcula despesas e lucro', () => {
    expect(r.despesas).toBe(70.5);
    expect(r.lucro).toBe(64.5);
    expect(r.porCategoria).toEqual({ Produtos: 50, Contas: 20.5 });
  });

  it('separa por forma de pagamento, incluindo não informado', () => {
    expect(r.porForma).toEqual({ dinheiro: 30, pix: 80, cartao: 0, naoInformado: 25 });
  });

  it('ordena os serviços pelo faturamento', () => {
    expect(r.porServico[0]).toEqual({ nome: 'Corte', total: 105, quantidade: 3 });
    expect(r.porServico[1].nome).toBe('Barba');
  });

  it('não divide por zero sem atendimentos', () => {
    expect(resumirFinanceiro({ agendamentos: [], despesas: [] }).ticketMedio).toBe(0);
  });
});

describe('validarDespesa', () => {
  const data = new Date(2026, 10, 24);

  it('aceita uma despesa válida', () => {
    const r = validarDespesa({ descricao: 'Luz', valor: '120,40', categoria: 'Contas', data });
    expect(r.valido).toBe(true);
    expect(r.dados.valor).toBe(120.4);
  });

  it('recusa valor zero e categoria desconhecida', () => {
    const r = validarDespesa({ descricao: 'Luz', valor: '0', categoria: 'Festa', data });
    expect(r.erros.valor).toBeDefined();
    expect(r.erros.categoria).toBeDefined();
  });
});

describe('intervaloDoMes', () => {
  it('vai do dia 1 até o dia 1 do mês seguinte, virando o ano', () => {
    const { inicio, fim } = intervaloDoMes(2026, 11);
    expect(inicio).toEqual(new Date(2026, 11, 1));
    expect(fim).toEqual(new Date(2027, 0, 1));
  });
});

describe('clientePodeCancelar', () => {
  const agora = new Date(2026, 10, 24, 12);
  it('só cancela pedido ou agendamento que ainda não aconteceu', () => {
    const futuro = new Date(2026, 10, 25);
    const passado = new Date(2026, 10, 23);
    expect(clientePodeCancelar({ status: 'pendente', data: futuro }, agora)).toBe(true);
    expect(clientePodeCancelar({ status: 'agendado', data: passado }, agora)).toBe(false);
    expect(clientePodeCancelar({ status: 'concluido', data: futuro }, agora)).toBe(false);
  });
});
