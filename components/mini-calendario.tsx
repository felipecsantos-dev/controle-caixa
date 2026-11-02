"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NOMES_MESES, semanasDoMes, somarMeses } from "@/lib/datas";
import type { StatusDia } from "@/lib/caixa";

const COR: Record<StatusDia, string> = {
  aberto: "bg-laranja-suave text-laranja-texto ring-1 ring-laranja/40",
  fechado: "bg-ok-suave text-ok",
  divergente: "bg-erro-suave text-erro ring-1 ring-erro/40",
};

const LEGENDA: [string, string][] = [
  ["bg-fundo ring-1 ring-borda", "Sem caixa"],
  [COR.aberto, "Aberto"],
  [COR.fechado, "Fechado"],
  [COR.divergente, "Divergente"],
];

export function MiniCalendario({
  mes,
  selecionado,
  hoje,
  status,
}: {
  mes: string;
  selecionado: string;
  hoje: string;
  status: Record<string, StatusDia>;
}) {
  const router = useRouter();
  const [ano, numeroMes] = mes.split("-");
  const anoAtual = Number(hoje.slice(0, 4));
  const anos = Array.from({ length: 6 }, (_, i) => anoAtual - 4 + i);
  const irPara = (m: string) => router.push(`/dia/${selecionado}?mes=${m}`);

  const seta =
    "grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-fundo hover:bg-borda";
  const seletor =
    "h-9 min-w-0 cursor-pointer rounded-xl border border-borda bg-white px-1.5 text-sm font-bold";

  return (
    <section className="rounded-[1.75rem] bg-white p-4" aria-label="Calendário">
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="Mês anterior" className={seta} onClick={() => irPara(somarMeses(mes, -1))}>
          <ChevronLeft size={18} />
        </button>
        <select
          aria-label="Mês"
          value={numeroMes}
          onChange={(e) => irPara(`${ano}-${e.target.value}`)}
          className={`${seletor} flex-1`}
        >
          {NOMES_MESES.map((nome, i) => (
            <option key={nome} value={String(i + 1).padStart(2, "0")}>
              {nome}
            </option>
          ))}
        </select>
        <select
          aria-label="Ano"
          value={ano}
          onChange={(e) => irPara(`${e.target.value}-${numeroMes}`)}
          className={seletor}
        >
          {anos.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <button type="button" aria-label="Próximo mês" className={seta} onClick={() => irPara(somarMeses(mes, 1))}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center text-xs font-bold text-cinza">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {semanasDoMes(mes)
          .flat()
          .map((dia, i) => {
            if (!dia) return <span key={i} />;
            const s = status[dia];
            const ativo = dia === selecionado;
            const futuro = dia > hoje;
            const dentro = Number(dia.slice(8));
            const titulo = s ? LEGENDA.find(([c]) => c === COR[s])?.[1] : "Sem caixa";
            const classe = `grid aspect-square w-full max-w-10 place-items-center justify-self-center rounded-full text-sm font-semibold ${
              ativo ? "bg-preto text-white" : s ? COR[s] : futuro ? "text-cinza/50" : "text-preto hover:bg-fundo"
            } ${dia === hoje && !ativo ? "underline decoration-2 underline-offset-2" : ""}`;
            if (futuro) {
              return (
                <span key={dia} className={classe}>
                  {dentro}
                </span>
              );
            }
            return (
              <Link key={dia} href={`/dia/${dia}`} className={classe} title={titulo} aria-label={`Dia ${dentro}: ${titulo}`}>
                {dentro}
              </Link>
            );
          })}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-cinza">
        {LEGENDA.map(([cor, nome]) => (
          <li key={nome} className="flex items-center gap-1.5">
            <span className={`size-3 rounded-full ${cor}`} />
            {nome}
          </li>
        ))}
      </ul>
    </section>
  );
}
