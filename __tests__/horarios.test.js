import {
  deMinutos,
  gerarHorariosLivres,
  paraMinutos,
  proximosDiasAbertos,
  validarFuncionamento,
} from '../src/utils/horarios';

// 24/11/2026 é uma terça-feira.
const TERCA = new Date(2026, 10, 24);
const DOMINGO = new Date(2026, 10, 29);
const ONTEM = new Date(2026, 10, 23, 12, 0);

const funcionamento = {
  dias: [2, 3, 4, 5, 6],
  abertura: '09:00',
  fechamento: '12:00',
  intervaloMin: 30,
};

const em = (h, m = 0) => new Date(2026, 10, 24, h, m);

describe('conversão de horas', () => {
  it('converte ida e volta', () => {
    expect(paraMinutos('09:30')).toBe(570);
    expect(deMinutos(570)).toBe('09:30');
    expect(deMinutos(paraMinutos('18:05'))).toBe('18:05');
  });
});

describe('gerarHorariosLivres', () => {
  it('lista todos os horários em que o serviço cabe até o fechamento', () => {
    const livres = gerarHorariosLivres({
      dia: TERCA,
      funcionamento,
      duracaoMin: 60,
      ocupados: [],
      agora: ONTEM,
    });
    // 09:00 até 11:00 (o de 11:30 não cabe: terminaria 12:30).
    expect(livres.map((d) => deMinutos(d.getHours() * 60 + d.getMinutes()))).toEqual([
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
    ]);
  });

  it('tira os horários que batem com atendimentos marcados', () => {
    const livres = gerarHorariosLivres({
      dia: TERCA,
      funcionamento,
      duracaoMin: 30,
      ocupados: [{ inicio: em(10), fim: em(11) }],
      agora: ONTEM,
    });
    expect(livres.map((d) => d.getHours() * 60 + d.getMinutes())).toEqual([540, 570, 660, 690]);
  });

  it('não oferece horário no passado nem com menos de 30 min de antecedência', () => {
    const livres = gerarHorariosLivres({
      dia: TERCA,
      funcionamento,
      duracaoMin: 30,
      ocupados: [],
      agora: em(10, 10),
    });
    expect(livres[0]).toEqual(em(11));
  });

  it('não abre em dia sem atendimento', () => {
    expect(
      gerarHorariosLivres({
        dia: DOMINGO,
        funcionamento,
        duracaoMin: 30,
        ocupados: [],
        agora: ONTEM,
      }),
    ).toEqual([]);
  });
});

describe('proximosDiasAbertos', () => {
  it('pula os dias fechados', () => {
    const dias = proximosDiasAbertos(funcionamento, 6, TERCA);
    expect(dias.map((d) => d.getDay())).toEqual([2, 3, 4, 5, 6, 2]);
  });
});

describe('validarFuncionamento', () => {
  it('exige fechamento depois da abertura e pelo menos um dia', () => {
    const r = validarFuncionamento({
      dias: [],
      abertura: '18:00',
      fechamento: '09:00',
      intervaloMin: 30,
    });
    expect(r.valido).toBe(false);
    expect(r.erros.dias).toBeDefined();
    expect(r.erros.fechamento).toBeDefined();
  });

  it('recusa hora fora do formato', () => {
    expect(validarFuncionamento({ ...funcionamento, abertura: '9h' }).erros.abertura).toBeDefined();
  });
});
