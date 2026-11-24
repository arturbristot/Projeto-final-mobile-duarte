import { apenasDigitos, lerNumero } from './format';
import { statusOcupaHorario } from './status';

/** Limites usados no app e espelhados nas regras do Firestore (firestore.rules). */
export const LIMITES = {
  nomeMin: 2,
  nomeMax: 60,
  observacoesMax: 500,
  precoMax: 10000,
  duracaoMin: 5,
  duracaoMax: 480,
};

function resultado(erros, dados) {
  const valido = Object.keys(erros).length === 0;
  return { valido, erros, dados: valido ? dados : null };
}

function validarNome(nome, rotulo) {
  const limpo = nome.trim();
  if (limpo.length < LIMITES.nomeMin) return `Informe o nome do ${rotulo}.`;
  if (limpo.length > LIMITES.nomeMax) return `Use no máximo ${LIMITES.nomeMax} caracteres.`;
  return null;
}

export function validarServico({ nome, preco, duracao }) {
  const erros = {};
  const valor = lerNumero(preco);
  const minutos = Number(duracao);

  const erroNome = validarNome(nome, 'serviço');
  if (erroNome) erros.nome = erroNome;

  if (preco.trim() === '' || isNaN(valor) || valor < 0) {
    erros.preco = 'Informe um preço válido.';
  } else if (valor > LIMITES.precoMax) {
    erros.preco = `O preço máximo é R$ ${LIMITES.precoMax}.`;
  }

  if (!Number.isInteger(minutos) || minutos < LIMITES.duracaoMin) {
    erros.duracao = `Duração mínima de ${LIMITES.duracaoMin} minutos.`;
  } else if (minutos > LIMITES.duracaoMax) {
    erros.duracao = `Duração máxima de ${LIMITES.duracaoMax / 60} horas.`;
  }

  return resultado(erros, {
    nome: nome.trim(),
    preco: Math.round(valor * 100) / 100,
    duracaoMin: minutos,
  });
}

export function telefoneValido(telefone) {
  const digitos = apenasDigitos(telefone);
  return digitos.length === 10 || digitos.length === 11;
}

export function validarCliente({ nome, telefone, observacoes }) {
  const erros = {};

  const erroNome = validarNome(nome, 'cliente');
  if (erroNome) erros.nome = erroNome;

  if (!telefoneValido(telefone)) erros.telefone = 'Informe o telefone com DDD.';

  if (observacoes.trim().length > LIMITES.observacoesMax) {
    erros.observacoes = `Use no máximo ${LIMITES.observacoesMax} caracteres.`;
  }

  return resultado(erros, {
    nome: nome.trim(),
    telefone,
    observacoes: observacoes.trim(),
  });
}

export function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Cadastro de conta. Cliente precisa de telefone; barbearia informa o nome do negócio. */
export function validarCadastro({ tipo, nome, telefone = '', email, senha, confirmacao }) {
  const erros = {};
  const ehCliente = tipo === 'cliente';

  const erroNome = ehCliente ? validarNome(nome, 'cliente') : validarNome(nome, 'negócio');
  if (erroNome) erros.nome = ehCliente ? 'Informe seu nome.' : erroNome;
  if (ehCliente && !telefoneValido(telefone)) erros.telefone = 'Informe o telefone com DDD.';
  if (!emailValido(email)) erros.email = 'E-mail inválido.';
  if (senha.length < 6) erros.senha = 'Mínimo de 6 caracteres.';
  if (confirmacao !== senha) erros.confirmacao = 'As senhas não conferem.';

  return resultado(erros, { tipo, nome: nome.trim(), telefone, email: email.trim(), senha });
}

/**
 * Indica se dois atendimentos se sobrepõem no tempo.
 * Um termina exatamente quando o outro começa: não conta como conflito.
 */
export function horariosSeSobrepoem(inicioA, duracaoA, inicioB, duracaoB) {
  const fimA = inicioA.getTime() + duracaoA * 60_000;
  const fimB = inicioB.getTime() + duracaoB * 60_000;
  return inicioA.getTime() < fimB && inicioB.getTime() < fimA;
}

/** Primeiro agendamento ativo da lista que conflita com o horário informado. */
export function encontrarConflito(agendamentos, inicio, duracaoMin, ignorarId) {
  return agendamentos.find(
    (a) =>
      a.id !== ignorarId &&
      statusOcupaHorario(a.status) &&
      horariosSeSobrepoem(inicio, duracaoMin, a.data, a.duracaoMin),
  );
}
