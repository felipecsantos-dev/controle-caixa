"use client";

import { ArrowUpFromLine, Lock, LockOpen, Plus, Printer, Undo2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ModalCancelarVenda,
  ModalDevolucao,
  ModalFechamento,
  ModalReabrir,
  ModalRetirada,
  ModalVenda,
  type Nomes,
} from "@/components/formularios";
import { Botao } from "@/components/ui";
import type { Totais } from "@/lib/calculo";

type Aberto = "venda" | "retirada" | "devolucao" | "fechar" | "reabrir" | null;

export function AcoesDia({
  data,
  status,
  abertura,
  totais,
  nomes,
}: {
  data: string;
  status: "aberto" | "fechado" | null;
  abertura: number;
  totais: Totais;
  nomes: Nomes;
}) {
  const [aberto, setAberto] = useState<Aberto>(null);
  const fechar = () => setAberto(null);

  // Atalho: tecla N abre uma nova venda, fora de campos de texto.
  useEffect(() => {
    if (status !== "aberto") return;
    function aoTeclar(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement;
      if (e.key.toLowerCase() !== "n" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/INPUT|SELECT|TEXTAREA/.test(alvo.tagName) || document.querySelector("dialog[open]")) return;
      e.preventDefault();
      setAberto("venda");
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [status]);

  return (
    <section className="flex flex-col gap-2.5" aria-label="Ações do caixa">
      {status === "aberto" && (
        <>
          <button
            type="button"
            onClick={() => setAberto("venda")}
            className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-[1.75rem] bg-gradient-to-br from-laranja to-laranja-claro text-preto transition-opacity hover:opacity-90"
          >
            <Plus size={30} strokeWidth={2.5} />
            <span className="text-base font-extrabold">Nova venda</span>
            <span className="text-xs font-semibold opacity-75">Atalho: tecla N</span>
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <Botao variante="claro" className="border-0 ring-0" onClick={() => setAberto("retirada")}>
              <ArrowUpFromLine size={17} /> Retirada
            </Botao>
            <Botao variante="claro" className="border-0 ring-0" onClick={() => setAberto("devolucao")}>
              <Undo2 size={17} /> Devolução
            </Botao>
          </div>
          <Botao variante="preto" onClick={() => setAberto("fechar")}>
            <Lock size={17} /> Fechar caixa
          </Botao>
        </>
      )}
      {status === "fechado" && (
        <Botao variante="preto" onClick={() => setAberto("reabrir")}>
          <LockOpen size={17} /> Reabrir caixa
        </Botao>
      )}
      {status && (
        <Botao variante="claro" className="border-0 ring-0" onClick={() => window.print()}>
          <Printer size={17} /> Imprimir folha
        </Botao>
      )}

      {aberto === "venda" && <ModalVenda data={data} nomes={nomes} aoFechar={fechar} />}
      {aberto === "retirada" && <ModalRetirada data={data} nomes={nomes} aoFechar={fechar} />}
      {aberto === "devolucao" && <ModalDevolucao data={data} nomes={nomes} aoFechar={fechar} />}
      {aberto === "fechar" && (
        <ModalFechamento
          data={data}
          abertura={abertura}
          totais={totais}
          operadores={nomes.operadores}
          aoFechar={fechar}
        />
      )}
      {aberto === "reabrir" && <ModalReabrir data={data} operadores={nomes.operadores} aoFechar={fechar} />}
    </section>
  );
}

export function BotaoCancelar({
  data,
  id,
  descricao,
  operadores,
}: {
  data: string;
  id: string;
  descricao: string;
  operadores: string[];
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        title="Cancelar venda"
        aria-label={`Cancelar venda: ${descricao}`}
        onClick={() => setAberto(true)}
        className="grid size-9 cursor-pointer place-items-center rounded-full text-cinza hover:bg-erro-suave hover:text-erro print:hidden"
      >
        <XCircle size={18} />
      </button>
      {aberto && (
        <ModalCancelarVenda
          data={data}
          id={id}
          descricao={descricao}
          operadores={operadores}
          aoFechar={() => setAberto(false)}
        />
      )}
    </>
  );
}
