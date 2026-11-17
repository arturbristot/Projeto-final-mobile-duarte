export function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarHora(data) {
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatarDataLonga(data) {
  return data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

export function formatarDataCurta(data) {
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Remove tudo que não é dígito: "(48) 99999-0000" -> "48999990000". */
export function apenasDigitos(texto) {
  return texto.replace(/\D/g, '');
}

export function formatarTelefone(texto) {
  const d = apenasDigitos(texto).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function inicioDoDia(data) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function somarDias(data, dias) {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d;
}

export function mesmoDia(a, b) {
  return inicioDoDia(a).getTime() === inicioDoDia(b).getTime();
}

/** Converte "35,90" ou "35.90" em número; retorna NaN se inválido. */
export function lerNumero(texto) {
  return Number(texto.replace(',', '.').trim());
}
