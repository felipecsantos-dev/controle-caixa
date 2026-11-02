import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import Link from "next/link";
import { BotaoImprimir } from "@/components/botao-imprimir";
import { MEIOS, NOME_MEIO } from "@/lib/calculo";
import { resumoDoMes, type StatusDia } from "@/lib/caixa";
import { dataCurta, hoje, mesValido, nomeMes, somarMeses } from "@/lib/datas";
import { brl } from "@/lib/dinheiro";

const SELO: Record<StatusDia, [string, string]> = {
  aberto: ["Aberto", "bg-laranja-suave text-laranja-texto"],
  fechado: ["Fechado", "bg-ok-suave text-ok"],
  divergente: ["Divergente", "bg-erro-suave text-erro"],
};

export default async function Resumo({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes: mesBusca } = await searchParams;
  const mes = mesBusca && mesValido(mesBusca) ? mesBusca : hoje().slice(0, 7);
  const { linhas, totais } = await resumoDoMes(mes);

  const seta = "grid size-10 place-items-center rounded-full bg-white hover:bg-borda";
  const celula = "px-3 py-2.5 text-right valor";

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-3">
      <header className="flex flex-wrap items-center gap-3 px-2 pt-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-cinza">Resumo do mês</p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{nomeMes(mes)}</h1>
        </div>
        <div className="flex items-center gap-1.5 print:hidden">
          <Link href={`/resumo?mes=${somarMeses(mes, -1)}`} aria-label="Mês anterior" className={seta}>
            <ChevronLeft size={18} />
          </Link>
          <Link href={`/resumo?mes=${somarMeses(mes, 1)}`} aria-label="Próximo mês" className={seta}>
            <ChevronRight size={18} />
          </Link>
          <a
            href={`/api/exportar?mes=${mes}`}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold hover:bg-borda"
          >
            <Download size={16} /> Excel
          </a>
          <BotaoImprimir />
        </div>
      </header>

      <section className="grid gap-4 rounded-[1.75rem] bg-preto p-6 text-white sm:grid-cols-[1.3fr_1fr_1fr_1fr] print:bg-white print:p-0 print:text-black">
        <div>
          <p className="text-sm font-medium text-white/70 print:text-black">Total do mês</p>
          <p className="valor text-3xl font-extrabold tracking-tight text-laranja-claro print:text-black">
            {brl(totais.total)}
          </p>
        </div>
        {[
          ["Retiradas", brl(totais.retiradas)],
          ["Diferenças", brl(totais.diferenca)],
          ["Dias fechados", `${totais.fechados} de ${totais.fechados + totais.abertos}`],
        ].map(([rotulo, valor]) => (
          <div key={rotulo}>
            <p className="text-sm font-medium text-white/70 print:text-black">{rotulo}</p>
            <p className="valor mt-1.5 text-xl font-bold">{valor}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {MEIOS.map((m) => (
          <div key={m} className="rounded-3xl bg-white p-4">
            <p className="text-sm font-bold">{NOME_MEIO[m]}</p>
            <p className="valor mt-2 text-2xl font-extrabold tracking-tight">{brl(totais.porMeio[m])}</p>
          </div>
        ))}
      </section>

      <section className="overflow-x-auto rounded-3xl bg-white p-2">
        {linhas.length === 0 ? (
          <p className="p-8 text-center font-semibold text-cinza">Nenhum caixa aberto neste mês.</p>
        ) : (
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="text-xs font-bold text-cinza">
                <th className="px-3 py-2.5 text-left">Dia</th>
                <th className="px-3 py-2.5 text-left">Situação</th>
                {MEIOS.map((m) => (
                  <th key={m} className="px-3 py-2.5 text-right">
                    {NOME_MEIO[m]}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right">Total</th>
                <th className="px-3 py-2.5 text-right">Retiradas</th>
                <th className="px-3 py-2.5 text-right">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.data} className="border-t border-borda hover:bg-fundo">
                  <td className="px-3 py-2.5 font-bold">
                    <Link href={`/dia/${l.data}`} className="text-laranja-texto hover:underline">
                      {dataCurta(l.data)}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${SELO[l.status][1]}`}>
                      {SELO[l.status][0]}
                    </span>
                  </td>
                  {MEIOS.map((m) => (
                    <td key={m} className={celula}>
                      {brl(l.porMeio[m])}
                    </td>
                  ))}
                  <td className={`${celula} font-extrabold`}>{brl(l.total)}</td>
                  <td className={celula}>{brl(l.retiradas)}</td>
                  <td className={`${celula} ${l.diferenca ? "font-bold text-erro" : ""}`}>{brl(l.diferenca)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
