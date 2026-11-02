import { Landmark } from "lucide-react";

/** Marca genérica do sistema. Troque por logo e nome da sua empresa. */
export function Marca({ compacta = false, className = "" }: { compacta?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-extrabold tracking-tight text-white ${className}`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-laranja text-preto">
        <Landmark size={20} aria-hidden />
      </span>
      {!compacta && <span className="text-lg leading-none">Controle de Caixa</span>}
    </span>
  );
}
