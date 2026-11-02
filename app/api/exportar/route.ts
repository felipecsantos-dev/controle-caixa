import { MEIOS, NOME_MEIO } from "@/lib/calculo";
import { resumoDoMes } from "@/lib/caixa";
import { dataCurta, mesValido } from "@/lib/datas";
import { decimal } from "@/lib/dinheiro";
import { temSessao } from "@/lib/sessao";

const SITUACAO = { aberto: "Aberto", fechado: "Fechado", divergente: "Divergente" };

export async function GET(request: Request) {
  if (!(await temSessao())) return new Response("Não autorizado", { status: 401 });

  const mes = new URL(request.url).searchParams.get("mes") ?? "";
  if (!mesValido(mes)) return new Response("Mês inválido", { status: 400 });

  const { linhas, totais } = await resumoDoMes(mes);
  const cabecalho = ["Dia", "Situação", ...MEIOS.map((m) => NOME_MEIO[m]), "Total", "Retiradas", "Diferença"];
  const corpo = linhas.map((l) => [
    dataCurta(l.data),
    SITUACAO[l.status],
    ...MEIOS.map((m) => decimal(l.porMeio[m])),
    decimal(l.total),
    decimal(l.retiradas),
    decimal(l.diferenca),
  ]);
  const rodape = [
    "Total",
    "",
    ...MEIOS.map((m) => decimal(totais.porMeio[m])),
    decimal(totais.total),
    decimal(totais.retiradas),
    decimal(totais.diferenca),
  ];

  // Ponto e vírgula e BOM fazem o Excel em português abrir as colunas e os acentos certos.
  const csv = "﻿" + [cabecalho, ...corpo, rodape].map((l) => l.join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="caixa-${mes}.csv"`,
    },
  });
}
