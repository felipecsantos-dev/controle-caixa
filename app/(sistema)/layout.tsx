import { BarraLateral } from "@/components/barra-lateral";
import { exigirSessao } from "@/lib/sessao";

export default async function LayoutSistema({ children }: { children: React.ReactNode }) {
  await exigirSessao();
  return (
    <div className="flex h-dvh print:block print:h-auto">
      <BarraLateral />
      <main className="min-w-0 flex-1 overflow-y-auto print:overflow-visible">{children}</main>
    </div>
  );
}
