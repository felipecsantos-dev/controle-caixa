// O servidor roda em UTC. "Hoje" no caixa é sempre o dia no horário de Brasília.
const FUSO = "America/Sao_Paulo";

export function hoje(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(agora);
}

export function fimDoDia(agora = new Date()) {
  // O Brasil não tem horário de verão desde 2019, então o fuso é fixo em -03:00.
  return new Date(`${hoje(agora)}T23:59:59-03:00`);
}

function utc(data: string) {
  return new Date(`${data}T00:00:00Z`);
}

export function dataValida(data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const d = utc(data);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === data;
}

export function mesValido(mes: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}

export function somarDias(data: string, n: number) {
  const d = utc(data);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function somarMeses(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
}

export function dataLonga(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(utc(data));
}

export function dataCurta(data: string) {
  return data.split("-").reverse().join("/");
}

export const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function nomeMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return `${NOMES_MESES[m - 1]} de ${a}`;
}

/** Semanas do mês, de domingo a sábado. Dias de fora do mês vêm como null. */
export function semanasDoMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  const inicio = new Date(Date.UTC(a, m - 1, 1)).getUTCDay();
  const total = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const celulas: (string | null)[] = Array(inicio).fill(null);
  for (let d = 1; d <= total; d++) celulas.push(`${mes}-${String(d).padStart(2, "0")}`);
  while (celulas.length % 7) celulas.push(null);
  const semanas: (string | null)[][] = [];
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));
  return semanas;
}
