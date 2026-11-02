const MAXIMO = 2_000_000_000; // limite do integer em centavos (R$ 20 milhões)

/** Converte o que foi digitado ("1.234,56", "50", "12,5") em centavos. */
export function paraCentavos(texto: string): number | null {
  let t = texto.replace(/\s|R\$/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [reais, centavos = ""] = t.split(".");
  const total = Number(reais) * 100 + Number(centavos.padEnd(2, "0"));
  return Number.isSafeInteger(total) && total <= MAXIMO ? total : null;
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function brl(centavos: number) {
  return moeda.format(centavos / 100);
}

export function decimal(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
