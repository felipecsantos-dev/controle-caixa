"use client";

import { CalendarDays, ChartColumn, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Marca } from "@/components/marca";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { sair } from "@/app/acoes";

const CHAVE = "caixa_barra_recolhida";

const ITENS = [
  { href: "/", base: "/dia", rotulo: "Caixa do dia", Icone: CalendarDays },
  { href: "/resumo", base: "/resumo", rotulo: "Resumo do mês", Icone: ChartColumn },
];

export function BarraLateral() {
  const caminho = usePathname();
  const [recolhida, setRecolhida] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no navegador
      setRecolhida(localStorage.getItem(CHAVE) === "1");
    } catch {}
  }, []);

  function alternar() {
    const nova = !recolhida;
    setRecolhida(nova);
    try {
      localStorage.setItem(CHAVE, nova ? "1" : "0");
    } catch {}
  }

  const item =
    "flex h-12 items-center gap-3 rounded-2xl text-sm font-semibold transition-colors " +
    (recolhida ? "w-12 justify-center" : "w-full px-3.5");

  return (
    <aside
      className={`m-3 mr-0 flex shrink-0 flex-col rounded-[1.75rem] bg-preto p-3 text-white transition-[width] print:hidden ${
        recolhida ? "w-[4.5rem]" : "w-56"
      }`}
    >
      <div className={`flex h-16 items-center ${recolhida ? "justify-center" : "px-2"}`}>
        {recolhida ? (
          <Marca compacta />
        ) : (
          <Marca />
        )}
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-2" aria-label="Principal">
        {ITENS.map(({ href, base, rotulo, Icone }) => {
          const ativo = caminho.startsWith(base);
          return (
            <Link
              key={href}
              href={href}
              title={rotulo}
              aria-current={ativo ? "page" : undefined}
              className={`${item} ${ativo ? "bg-laranja text-preto" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
            >
              <Icone size={20} className="shrink-0" />
              {!recolhida && rotulo}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={alternar}
          title={recolhida ? "Expandir barra" : "Recolher barra"}
          aria-label={recolhida ? "Expandir barra" : "Recolher barra"}
          className={`${item} cursor-pointer text-white/75 hover:bg-white/10 hover:text-white`}
        >
          {recolhida ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} className="shrink-0" />}
          {!recolhida && "Recolher"}
        </button>
        <form action={sair}>
          <button
            type="submit"
            title="Sair"
            aria-label="Sair"
            className={`${item} cursor-pointer text-white/75 hover:bg-white/10 hover:text-white`}
          >
            <LogOut size={20} className="shrink-0" />
            {!recolhida && "Sair"}
          </button>
        </form>
      </div>
    </aside>
  );
}
