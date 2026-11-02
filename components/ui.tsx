"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";

const VARIANTES = {
  laranja: "bg-laranja text-preto hover:bg-laranja-claro",
  preto: "bg-preto text-white hover:bg-grafite",
  claro: "bg-white text-preto ring-1 ring-borda hover:bg-fundo",
  perigo: "bg-erro text-white hover:opacity-90",
};

export function Botao({
  variante = "laranja",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: keyof typeof VARIANTES }) {
  return (
    <button
      {...props}
      className={`inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTES[variante]} ${className}`}
    />
  );
}

export function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-cinza">{dica}</span>}
    </label>
  );
}

const CLASSE_ENTRADA =
  "h-12 w-full rounded-xl border border-borda bg-white px-3.5 text-base outline-none focus:border-laranja focus:ring-2 focus:ring-laranja/25";

export function Entrada(props: ComponentProps<"input">) {
  return <input {...props} className={`${CLASSE_ENTRADA} ${props.className ?? ""}`} />;
}

export function EntradaValor(props: ComponentProps<"input">) {
  return (
    <div className="relative">
      <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-semibold text-cinza">R$</span>
      <input
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        {...props}
        className={`${CLASSE_ENTRADA} valor pl-10 font-bold ${props.className ?? ""}`}
      />
    </div>
  );
}

export function Selecao({ opcoes, ...props }: ComponentProps<"select"> & { opcoes: string[] }) {
  return (
    <select {...props} className={CLASSE_ENTRADA}>
      <option value="">Selecione</option>
      {opcoes.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function MensagemErro({ erro }: { erro?: string }) {
  if (!erro) return null;
  return (
    <p role="alert" className="rounded-xl bg-erro-suave px-3.5 py-2.5 text-sm font-semibold text-erro">
      {erro}
    </p>
  );
}

export function Modal({
  titulo,
  aoFechar,
  children,
}: {
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    // showModal foca o primeiro botão (o X). O caixa precisa começar digitando.
    d?.querySelector<HTMLElement>("input:not([type=hidden])")?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      className="m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[1.75rem] bg-white p-0 text-preto"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-6 pt-6 pb-3">
        <h2 className="text-xl font-extrabold tracking-tight">{titulo}</h2>
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => ref.current?.close()}
          className="grid size-9 cursor-pointer place-items-center rounded-full bg-fundo hover:bg-borda"
        >
          <X size={18} />
        </button>
      </div>
      <div className="px-6 pb-6">{children}</div>
    </dialog>
  );
}
