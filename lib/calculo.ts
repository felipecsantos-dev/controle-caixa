export const MEIOS = ["dinheiro", "pix", "cartao", "notinha"] as const;
export type Meio = (typeof MEIOS)[number];

export const NOME_MEIO: Record<Meio, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartão",
  notinha: "Notinha",
};

export function ehMeio(v: unknown): v is Meio {
  return MEIOS.includes(v as Meio);
}

type VendaCalculo = { valor: number; desconto: number; meio: Meio; status: string };
type Valor = { valor: number };
type DevolucaoCalculo = Valor & { meio: Meio };

export type Totais = {
  porMeio: Record<Meio, number>;
  quantidade: Record<Meio, number>;
  total: number;
  descontos: number;
  retiradas: number;
  devolucoes: number;
  vendasDinheiro: number;
  devolucoesDinheiro: number;
  dinheiroEsperado: number;
};

/** Regra do caixa. Venda cancelada não conta. Devolução subtrai do seu meio. */
export function calcularTotais(
  abertura: number,
  vendas: VendaCalculo[],
  retiradas: Valor[],
  devolucoes: DevolucaoCalculo[],
): Totais {
  const zerado = () => ({ dinheiro: 0, pix: 0, cartao: 0, notinha: 0 });
  const porMeio: Record<Meio, number> = zerado();
  const quantidade: Record<Meio, number> = zerado();
  let descontos = 0;

  for (const v of vendas) {
    if (v.status !== "ativa") continue;
    porMeio[v.meio] += v.valor;
    quantidade[v.meio] += 1;
    descontos += v.desconto;
  }
  const vendasDinheiro = porMeio.dinheiro;

  let totalDevolucoes = 0;
  let devolucoesDinheiro = 0;
  for (const d of devolucoes) {
    porMeio[d.meio] -= d.valor;
    totalDevolucoes += d.valor;
    if (d.meio === "dinheiro") devolucoesDinheiro += d.valor;
  }

  const totalRetiradas = retiradas.reduce((s, r) => s + r.valor, 0);

  return {
    porMeio,
    quantidade,
    total: MEIOS.reduce((s, m) => s + porMeio[m], 0),
    descontos,
    retiradas: totalRetiradas,
    devolucoes: totalDevolucoes,
    vendasDinheiro,
    devolucoesDinheiro,
    dinheiroEsperado: abertura + vendasDinheiro - totalRetiradas - devolucoesDinheiro,
  };
}
