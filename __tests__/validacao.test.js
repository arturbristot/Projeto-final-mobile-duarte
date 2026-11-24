import {
  encontrarConflito,
  horariosSeSobrepoem,
  telefoneValido,
  validarCadastro,
  validarCliente,
  validarServico,
} from '../src/utils/validacao';

const hora = (h, m = 0) => new Date(2026, 10, 24, h, m);

describe('validarServico', () => {
  it('aceita um serviço válido e converte preço com vírgula', () => {
    const r = validarServico({ nome: ' Corte ', preco: '35,90', duracao: '30' });
    expect(r.valido).toBe(true);
    expect(r.dados).toEqual({ nome: 'Corte', preco: 35.9, duracaoMin: 30 });
  });

  it('recusa nome vazio, preço inválido e duração curta', () => {
    const r = validarServico({ nome: ' ', preco: 'abc', duracao: '2' });
    expect(r.valido).toBe(false);
    expect(Object.keys(r.erros)).toEqual(['nome', 'preco', 'duracao']);
    expect(r.dados).toBeNull();
  });

  it('respeita os limites de preço e duração', () => {
    expect(validarServico({ nome: 'X1', preco: '20000', duracao: '30' }).erros.preco).toBeDefined();
    expect(validarServico({ nome: 'X1', preco: '10', duracao: '600' }).erros.duracao).toBeDefined();
  });
});

describe('validarCliente', () => {
  it('exige telefone com DDD', () => {
    expect(telefoneValido('(48) 99999-0000')).toBe(true);
    expect(telefoneValido('(48) 3333-0000')).toBe(true);
    expect(telefoneValido('99999-0000')).toBe(false);
    expect(
      validarCliente({ nome: 'Ana', telefone: '123', observacoes: '' }).erros.telefone,
    ).toBeDefined();
  });

  it('limita o tamanho das observações', () => {
    const r = validarCliente({
      nome: 'Ana',
      telefone: '48999990000',
      observacoes: 'a'.repeat(501),
    });
    expect(r.erros.observacoes).toBeDefined();
  });
});

describe('validarCadastro', () => {
  const base = { nome: 'João', email: 'joao@email.com', senha: '123456', confirmacao: '123456' };

  it('cliente precisa de telefone, barbearia não', () => {
    expect(
      validarCadastro({ ...base, tipo: 'cliente', telefone: '' }).erros.telefone,
    ).toBeDefined();
    expect(validarCadastro({ ...base, tipo: 'barbeiro' }).valido).toBe(true);
  });

  it('confere e-mail, tamanho da senha e confirmação', () => {
    const r = validarCadastro({
      ...base,
      tipo: 'barbeiro',
      email: 'x@',
      senha: '123',
      confirmacao: '1',
    });
    expect(Object.keys(r.erros).sort()).toEqual(['confirmacao', 'email', 'senha']);
  });
});

describe('conflito de horários', () => {
  it('detecta sobreposição e permite horários encostados', () => {
    expect(horariosSeSobrepoem(hora(10), 30, hora(10, 15), 30)).toBe(true);
    expect(horariosSeSobrepoem(hora(10), 30, hora(10, 30), 30)).toBe(false);
    expect(horariosSeSobrepoem(hora(10, 30), 30, hora(10), 30)).toBe(false);
  });

  it('ignora cancelados, recusados e o próprio agendamento', () => {
    const lista = [
      { id: 'a', data: hora(10), duracaoMin: 30, status: 'cancelado' },
      { id: 'b', data: hora(10), duracaoMin: 30, status: 'recusado' },
      { id: 'c', data: hora(10), duracaoMin: 30, status: 'agendado' },
    ];
    expect(encontrarConflito(lista, hora(10), 30, 'c')).toBeUndefined();
    expect(encontrarConflito(lista, hora(10), 30)?.id).toBe('c');
  });

  it('pedido pendente também ocupa o horário', () => {
    const lista = [{ id: 'p', data: hora(14), duracaoMin: 60, status: 'pendente' }];
    expect(encontrarConflito(lista, hora(14, 30), 30)?.id).toBe('p');
  });
});
