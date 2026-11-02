"use client";

import { Printer } from "lucide-react";

export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-sm font-bold hover:bg-borda"
    >
      <Printer size={16} /> PDF
    </button>
  );
}
