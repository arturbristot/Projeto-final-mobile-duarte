import { horariosSeSobrepoem } from './validacao';
import { inicioDoDia, somarDias } from './format';

/** Dias da semana como no JavaScript: 0 = domingo ... 6 = sábado. */
export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const FUNCIONAMENTO_PADRAO = {
  dias: [1, 2, 3, 4, 5, 6],
  abertura: '09:00',
  fechamento: '19:00',
  intervaloMin: 30,
};

/** Antecedência mínima para o cliente marcar pelo app. */
export const ANTECEDENCIA_MIN = 30;

const FORMATO_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function horaValida(texto) {
  return FORMATO_HORA.test(texto);
}

/** "09:30" -> 570 (minutos desde a meia-noite). */
export function paraMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/** 570 -> "09:30". */
export function deMinutos(total) {
  const h = String(Math.floor(total / 60)).padStart(2, '0');
  const m = String(total % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function validarFuncionamento({ dias, abertura, fechamento, intervaloMin }) {
  const erros = {};
  if (!dias.length) erros.dias = 'Escolha pelo menos um dia de atendimento.';
  if (!horaValida(abertura)) erros.abertura = 'Use o formato 09:00.';
  if (!horaValida(fechamento)) erros.fechamento = 'Use o formato 19:00.';
  if (!erros.abertura && !erros.fechamento && paraMinutos(fechamento) <= paraMinutos(abertura)) {
    erros.fechamento = 'O fechamento deve ser depois da abertura.';
  }
  if (![15, 30, 60].includes(intervaloMin)) erros.intervalo = 'Escolha 15, 30 ou 60 minutos.';
  return { valido: Object.keys(erros).length === 0, erros };
}

export function abreNoDia(funcionamento, dia) {
  return funcionamento.dias.includes(dia.getDay());
}

/** Próximos `quantidade` dias em que a barbearia abre, a partir de hoje. */
export function proximosDiasAbertos(funcionamento, quantidade, hoje = new Date()) {
  const dias = [];
  let dia = inicioDoDia(hoje);
  for (let i = 0; i < 60 && dias.length < quantidade; i += 1) {
    if (abreNoDia(funcionamento, dia)) dias.push(dia);
    dia = somarDias(dia, 1);
  }
  return dias;
}

/**
 * Horários em que um serviço de `duracaoMin` cabe inteiro no dia, sem
 * sobrepor nenhum horário ocupado e respeitando a antecedência mínima.
 * `ocupados` é uma lista de { inicio: Date, fim: Date }.
 */
export function gerarHorariosLivres({
  dia,
  funcionamento,
  duracaoMin,
  ocupados,
  agora = new Date(),
}) {
  if (!abreNoDia(funcionamento, dia)) return [];

  const abertura = paraMinutos(funcionamento.abertura);
  const fechamento = paraMinutos(funcionamento.fechamento);
  const limite = agora.getTime() + ANTECEDENCIA_MIN * 60_000;
  const livres = [];

  for (let min = abertura; min + duracaoMin <= fechamento; min += funcionamento.intervaloMin) {
    const inicio = inicioDoDia(dia);
    inicio.setMinutes(min);
    if (inicio.getTime() < limite) continue;

    const conflita = ocupados.some((o) =>
      horariosSeSobrepoem(inicio, duracaoMin, o.inicio, (o.fim - o.inicio) / 60_000),
    );
    if (!conflita) livres.push(inicio);
  }
  return livres;
}
