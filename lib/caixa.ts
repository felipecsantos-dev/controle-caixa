import { calcularTotais, type Meio, MEIOS } from "./calculo";
import { consultar } from "./db";

export type Dia = {
  data: string;
  status: "aberto" | "fechado";
  valor_abertura: number;
  aberto_por: string;
  aberto_hora: string;
  fechado_por: string | null;
  fechado_hora: string | null;
  dinheiro_esperado: number | null;
  dinheiro_contado: number | null;
  diferenca: number | null;
  motivo_divergencia: string | null;
};

export type Venda = {
  id: string;
  hora: string;
  valor: number;
  desconto: number;
  meio: Meio;
  vendedor: string;
  operador: string;
  empresa: string | null;
  num_notinha: string | null;
  status: string;
  motivo_cancelamento: string | null;
  cancelado_por: string | null;
};

export type Retirada = {
  id: string;
  hora: string;
  valor: number;
  retirado_por: string;
  finalidade: string;
  operador: string;
};

export type Devolucao = {
  id: string;
  hora: string;
  valor: number;
  meio: Meio;
  motivo: string;
  responsavel: string;
};

const HORA = `to_char(criado_em at time zone 'America/Sao_Paulo', 'HH24:MI')`;

export async function obterDia(data: string) {
  const [dia] = await consultar<Dia>(
    `select data::text, status, valor_abertura, aberto_por,
       to_char(aberto_em at time zone 'America/Sao_Paulo', 'HH24:MI') as aberto_hora,
       fechado_por,
       to_char(fechado_em at time zone 'America/Sao_Paulo', 'HH24:MI') as fechado_hora,
       dinheiro_esperado, dinheiro_contado, diferenca, motivo_divergencia
     from dias where data = $1::date`,
    [data],
  );
  return dia ?? null;
}

export async function obterMovimento(data: string) {
  const [vendas, retiradas, devolucoes] = await Promise.all([
    consultar<Venda>(
      `select id::text, ${HORA} as hora, valor, desconto, meio, vendedor, operador,
         empresa, num_notinha, status, motivo_cancelamento, cancelado_por
       from vendas where data = $1::date order by id desc`,
      [data],
    ),
    consultar<Retirada>(
      `select id::text, ${HORA} as hora, valor, retirado_por, finalidade, operador
       from retiradas where data = $1::date order by id desc`,
      [data],
    ),
    consultar<Devolucao>(
      `select id::text, ${HORA} as hora, valor, meio, motivo, responsavel
       from devolucoes where data = $1::date order by id desc`,
      [data],
    ),
  ]);
  return { vendas, retiradas, devolucoes };
}

export async function listarNomes() {
  const [operadores, vendedores] = await Promise.all([
    consultar<{ nome: string }>("select nome from operadores where ativo order by id"),
    consultar<{ nome: string }>("select nome from vendedores where ativo order by nome"),
  ]);
  return {
    operadores: operadores.map((o) => o.nome),
    vendedores: vendedores.map((v) => v.nome),
  };
}

export type StatusDia = "aberto" | "fechado" | "divergente";

export async function statusDoMes(mes: string) {
  const linhas = await consultar<{ data: string; status: string; diferenca: number | null }>(
    `select data::text, status, diferenca from dias
     where to_char(data, 'YYYY-MM') = $1`,
    [mes],
  );
  const mapa: Record<string, StatusDia> = {};
  for (const l of linhas) {
    mapa[l.data] = l.status === "aberto" ? "aberto" : l.diferenca ? "divergente" : "fechado";
  }
  return mapa;
}

export type LinhaResumo = {
  data: string;
  status: StatusDia;
  abertura: number;
  porMeio: Record<Meio, number>;
  total: number;
  retiradas: number;
  diferenca: number;
};

export async function resumoDoMes(mes: string) {
  const [dias, vendas, retiradas, devolucoes] = await Promise.all([
    consultar<{ data: string; status: string; valor_abertura: number; diferenca: number | null }>(
      `select data::text, status, valor_abertura, diferenca from dias
       where to_char(data, 'YYYY-MM') = $1 order by data`,
      [mes],
    ),
    consultar<{ data: string; meio: Meio; valor: number; desconto: number; status: string }>(
      `select data::text, meio, valor, desconto, status from vendas
       where to_char(data, 'YYYY-MM') = $1`,
      [mes],
    ),
    consultar<{ data: string; valor: number }>(
      `select data::text, valor from retiradas where to_char(data, 'YYYY-MM') = $1`,
      [mes],
    ),
    consultar<{ data: string; meio: Meio; valor: number }>(
      `select data::text, meio, valor from devolucoes where to_char(data, 'YYYY-MM') = $1`,
      [mes],
    ),
  ]);

  const linhas: LinhaResumo[] = dias.map((d) => {
    const t = calcularTotais(
      d.valor_abertura,
      vendas.filter((v) => v.data === d.data),
      retiradas.filter((r) => r.data === d.data),
      devolucoes.filter((v) => v.data === d.data),
    );
    return {
      data: d.data,
      status: d.status === "aberto" ? "aberto" : d.diferenca ? "divergente" : "fechado",
      abertura: d.valor_abertura,
      porMeio: t.porMeio,
      total: t.total,
      retiradas: t.retiradas,
      diferenca: d.diferenca ?? 0,
    };
  });

  const soma = (f: (l: LinhaResumo) => number) => linhas.reduce((s, l) => s + f(l), 0);
  return {
    linhas,
    totais: {
      porMeio: Object.fromEntries(MEIOS.map((m) => [m, soma((l) => l.porMeio[m])])) as Record<Meio, number>,
      total: soma((l) => l.total),
      retiradas: soma((l) => l.retiradas),
      diferenca: soma((l) => l.diferenca),
      fechados: linhas.filter((l) => l.status !== "aberto").length,
      abertos: linhas.filter((l) => l.status === "aberto").length,
    },
  };
}
