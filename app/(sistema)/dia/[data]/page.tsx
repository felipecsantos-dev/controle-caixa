import { ArrowUpFromLine, ChevronLeft, ChevronRight, Lock, Undo2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AcoesDia, BotaoCancelar } from "@/components/acoes-dia";
import { FormAbertura } from "@/components/formularios";
import { ICONE_MEIO } from "@/components/icones-meio";
import { MiniCalendario } from "@/components/mini-calendario";
import { calcularTotais, ehMeio, MEIOS, NOME_MEIO, type Meio } from "@/lib/calculo";
import {
  listarNomes,
  obterDia,
  obterMovimento,
  statusDoMes,
  type Devolucao,
  type Retirada,
  type Venda,
} from "@/lib/caixa";
import { dataCurta, dataLonga, dataValida, hoje, mesValido, somarDias } from "@/lib/datas";
import { brl } from "@/lib/dinheiro";

type Filtro = Meio | "retiradas" | null;

export default async function PaginaDia({
  params,
  searchParams,
}: {
  params: Promise<{ data: string }>;
  searchParams: Promise<{ mes?: string; filtro?: string }>;
}) {
  const { data } = await params;
  if (!dataValida(data)) notFound();
  const busca = await searchParams;

  const hojeStr = hoje();
  const mes = busca.mes && mesValido(busca.mes) ? busca.mes : data.slice(0, 7);
  const filtro: Filtro = ehMeio(busca.filtro) || busca.filtro === "retiradas" ? busca.filtro : null;

  const [dia, movimento, nomes, status] = await Promise.all([
    obterDia(data),
    obterMovimento(data),
    listarNomes(),
    statusDoMes(mes),
  ]);
  const { vendas, retiradas, devolucoes } = movimento;
  const abertura = dia?.valor_abertura ?? 0;
  const totais = calcularTotais(abertura, vendas, retiradas, devolucoes);
  const editavel = dia?.status === "aberto";
  const futuro = data > hojeStr;

  const linkDia = (d: string) => `/dia/${d}`;
  const linkFiltro = (f: Filtro) => {
    const q = new URLSearchParams();
    if (busca.mes) q.set("mes", busca.mes);
    if (f && f !== filtro) q.set("filtro", f);
    const s = q.toString();
    return `/dia/${data}${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto grid max-w-[1400px] gap-4 p-3 lg:grid-cols-[minmax(0,1fr)_21rem] print:block">
      <div className="min-w-0 space-y-4">
        <header className="flex flex-wrap items-center gap-3 px-2 pt-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-cinza">
              {data === hojeStr ? "Caixa de hoje" : "Caixa do dia"}
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight first-letter:uppercase sm:text-3xl">
              {dataLonga(data)}
            </h1>
          </div>
          <Selo dia={dia} />
          <div className="flex gap-1.5 print:hidden">
            <Link href={linkDia(somarDias(data, -1))} aria-label="Dia anterior" className={CLASSE_SETA}>
              <ChevronLeft size={18} />
            </Link>
            {data < hojeStr ? (
              <Link href={linkDia(somarDias(data, 1))} aria-label="Próximo dia" className={CLASSE_SETA}>
                <ChevronRight size={18} />
              </Link>
            ) : (
              <span aria-hidden className={`${CLASSE_SETA} opacity-30`}>
                <ChevronRight size={18} />
              </span>
            )}
          </div>
        </header>

        {!dia ? (
          <section className="mx-auto max-w-md rounded-[1.75rem] bg-white p-6">
            {futuro ? (
              <p className="py-6 text-center font-semibold text-cinza">
                Não é possível abrir o caixa de um dia futuro.
              </p>
            ) : (
              <>
                <h2 className="mb-1 text-xl font-extrabold tracking-tight">Abrir caixa</h2>
                <p className="mb-4 text-sm text-cinza">
                  Informe o valor inicial para começar os lançamentos de {dataCurta(data)}.
                </p>
                <FormAbertura data={data} operadores={nomes.operadores} />
              </>
            )}
          </section>
        ) : (
          <>
            <section className="grid gap-4 rounded-[1.75rem] bg-preto p-6 text-white sm:grid-cols-[1.3fr_1fr_1fr_1fr] print:bg-white print:p-0 print:text-black">
              <div>
                <p className="text-sm font-medium text-white/70 print:text-black">Total do dia</p>
                <p className="valor text-3xl font-extrabold tracking-tight text-laranja-claro print:text-black">
                  {brl(totais.total)}
                </p>
              </div>
              <Numero rotulo="Abertura" valor={brl(abertura)} />
              <Link href={linkFiltro("retiradas")} className="block rounded-xl hover:opacity-80" aria-pressed={filtro === "retiradas"}>
                <Numero
                  rotulo="Retiradas"
                  valor={brl(totais.retiradas)}
                  sublinhado={filtro === "retiradas"}
                />
              </Link>
              <Numero rotulo="Dinheiro em caixa" valor={brl(totais.dinheiroEsperado)} />
            </section>

            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Totais por meio de pagamento">
              {MEIOS.map((m) => {
                const Icone = ICONE_MEIO[m];
                const ativo = filtro === m;
                return (
                  <Link
                    key={m}
                    href={linkFiltro(m)}
                    aria-pressed={ativo}
                    className={`rounded-3xl p-4 transition-colors ${
                      ativo ? "bg-laranja text-preto" : "bg-white hover:bg-laranja-suave"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{NOME_MEIO[m]}</span>
                      <Icone size={20} className={ativo ? "" : "text-laranja-texto"} />
                    </div>
                    <p className="valor mt-2 text-2xl font-extrabold tracking-tight">{brl(totais.porMeio[m])}</p>
                    <p className={`text-xs ${ativo ? "" : "text-cinza"}`}>
                      {totais.quantidade[m]} {totais.quantidade[m] === 1 ? "venda" : "vendas"}
                    </p>
                  </Link>
                );
              })}
            </section>

            {dia.status === "fechado" && <ResumoFechamento dia={dia} />}

            <Lancamentos
              data={data}
              vendas={vendas}
              retiradas={retiradas}
              devolucoes={devolucoes}
              filtro={filtro}
              editavel={editavel}
              operadores={nomes.operadores}
              limparFiltro={linkFiltro(null)}
              descontos={totais.descontos}
            />
          </>
        )}
      </div>

      <aside className="space-y-3 lg:sticky lg:top-3 lg:self-start print:hidden">
        <MiniCalendario mes={mes} selecionado={data} hoje={hojeStr} status={status} />
        <AcoesDia data={data} status={dia?.status ?? null} abertura={abertura} totais={totais} nomes={nomes} />
      </aside>
    </div>
  );
}

const CLASSE_SETA = "grid size-10 place-items-center rounded-full bg-white hover:bg-borda";

function Numero({ rotulo, valor, sublinhado }: { rotulo: string; valor: string; sublinhado?: boolean }) {
  return (
    <div>
      <p className={`text-sm font-medium text-white/70 print:text-black ${sublinhado ? "underline decoration-laranja decoration-2 underline-offset-4" : ""}`}>
        {rotulo}
      </p>
      <p className="valor mt-1.5 text-xl font-bold">{valor}</p>
    </div>
  );
}

function Selo({ dia }: { dia: Awaited<ReturnType<typeof obterDia>> }) {
  if (!dia) return <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-cinza">Sem caixa</span>;
  if (dia.status === "aberto") {
    return (
      <span className="rounded-full bg-laranja-suave px-3 py-1.5 text-xs font-bold text-laranja-texto">
        Aberto por {dia.aberto_por} às {dia.aberto_hora}
      </span>
    );
  }
  return dia.diferenca ? (
    <span className="rounded-full bg-erro-suave px-3 py-1.5 text-xs font-bold text-erro">Fechado com divergência</span>
  ) : (
    <span className="rounded-full bg-ok-suave px-3 py-1.5 text-xs font-bold text-ok">Fechado</span>
  );
}

function ResumoFechamento({ dia }: { dia: NonNullable<Awaited<ReturnType<typeof obterDia>>> }) {
  const diferenca = dia.diferenca ?? 0;
  return (
    <section className="rounded-3xl bg-white p-5">
      <h2 className="flex items-center gap-2 font-extrabold tracking-tight">
        <Lock size={17} /> Fechamento por {dia.fechado_por} às {dia.fechado_hora}
      </h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        {[
          ["Esperado", brl(dia.dinheiro_esperado ?? 0)],
          ["Contado", brl(dia.dinheiro_contado ?? 0)],
          ["Diferença", brl(diferenca)],
        ].map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt className="text-xs text-cinza">{rotulo}</dt>
            <dd className={`valor text-lg font-bold ${rotulo === "Diferença" && diferenca ? "text-erro" : ""}`}>{valor}</dd>
          </div>
        ))}
      </dl>
      {dia.motivo_divergencia && (
        <p className="mt-3 rounded-xl bg-erro-suave px-3.5 py-2.5 text-sm text-erro">
          <strong>Motivo:</strong> {dia.motivo_divergencia}
        </p>
      )}
    </section>
  );
}

type Linha =
  | { tipo: "venda"; ordem: string; v: Venda }
  | { tipo: "retirada"; ordem: string; r: Retirada }
  | { tipo: "devolucao"; ordem: string; d: Devolucao };

function Lancamentos({
  data,
  vendas,
  retiradas,
  devolucoes,
  filtro,
  editavel,
  operadores,
  limparFiltro,
  descontos,
}: {
  data: string;
  vendas: Venda[];
  retiradas: Retirada[];
  devolucoes: Devolucao[];
  filtro: Filtro;
  editavel: boolean;
  operadores: string[];
  limparFiltro: string;
  descontos: number;
}) {
  const linhas: Linha[] = [
    ...vendas
      .filter((v) => filtro !== "retiradas" && (!filtro || v.meio === filtro))
      .map((v) => ({ tipo: "venda" as const, ordem: v.hora, v })),
    ...retiradas
      .filter(() => !filtro || filtro === "retiradas")
      .map((r) => ({ tipo: "retirada" as const, ordem: r.hora, r })),
    ...devolucoes
      .filter((d) => filtro !== "retiradas" && (!filtro || d.meio === filtro))
      .map((d) => ({ tipo: "devolucao" as const, ordem: d.hora, d })),
  ].sort((a, b) => b.ordem.localeCompare(a.ordem));

  const titulo = !filtro ? "Lançamentos" : filtro === "retiradas" ? "Retiradas" : `Lançamentos em ${NOME_MEIO[filtro]}`;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3 px-2">
        <h2 className="text-lg font-extrabold tracking-tight">{titulo}</h2>
        <div className="flex items-center gap-3 text-sm">
          {descontos > 0 && <span className="text-cinza">Descontos: {brl(descontos)}</span>}
          {filtro && (
            <Link href={limparFiltro} className="font-bold text-laranja-texto hover:underline print:hidden">
              Ver todos
            </Link>
          )}
        </div>
      </div>

      {linhas.length === 0 ? (
        <p className="rounded-3xl bg-white p-8 text-center font-semibold text-cinza">Nenhum lançamento.</p>
      ) : (
        <ul className="space-y-2">
          {linhas.map((l) => {
            if (l.tipo === "venda") {
              const { v } = l;
              const cancelada = v.status === "cancelada";
              const Icone = ICONE_MEIO[v.meio];
              const descricao = `${brl(v.valor)} em ${NOME_MEIO[v.meio]}, vendedor ${v.vendedor}`;
              return (
                <Item
                  key={`v${v.id}`}
                  hora={v.hora}
                  icone={<Icone size={18} />}
                  titulo={NOME_MEIO[v.meio]}
                  detalhe={[
                    v.vendedor,
                    v.empresa,
                    v.num_notinha && `Nº ${v.num_notinha}`,
                    v.desconto ? `Desconto ${brl(v.desconto)}` : null,
                    `Lançado por ${v.operador}`,
                  ]}
                  aviso={cancelada ? `Cancelada por ${v.cancelado_por}: ${v.motivo_cancelamento}` : undefined}
                  valor={brl(v.valor)}
                  apagado={cancelada}
                  acao={
                    editavel && !cancelada ? (
                      <BotaoCancelar data={data} id={v.id} descricao={descricao} operadores={operadores} />
                    ) : undefined
                  }
                />
              );
            }
            if (l.tipo === "retirada") {
              const { r } = l;
              return (
                <Item
                  key={`r${r.id}`}
                  hora={r.hora}
                  icone={<ArrowUpFromLine size={18} />}
                  titulo="Retirada"
                  detalhe={[r.retirado_por, r.finalidade, `Lançado por ${r.operador}`]}
                  valor={`− ${brl(r.valor)}`}
                />
              );
            }
            const { d } = l;
            return (
              <Item
                key={`d${d.id}`}
                hora={d.hora}
                icone={<Undo2 size={18} />}
                titulo={`Devolução em ${NOME_MEIO[d.meio]}`}
                detalhe={[d.motivo, `Responsável ${d.responsavel}`]}
                valor={`− ${brl(d.valor)}`}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Item({
  hora,
  icone,
  titulo,
  detalhe,
  aviso,
  valor,
  apagado,
  acao,
}: {
  hora: string;
  icone: React.ReactNode;
  titulo: string;
  detalhe: (string | null | undefined)[];
  aviso?: string;
  valor: string;
  apagado?: boolean;
  acao?: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 print:break-inside-avoid print:border print:border-borda">
      <span className="valor w-11 shrink-0 text-sm font-semibold text-cinza">{hora}</span>
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${apagado ? "bg-fundo text-cinza" : "bg-laranja-suave text-laranja-texto"}`}>
        {icone}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold ${apagado ? "line-through opacity-60" : ""}`}>{titulo}</p>
        <p className="truncate text-xs text-cinza">{detalhe.filter(Boolean).join(" · ")}</p>
        {aviso && <p className="text-xs font-semibold text-erro">{aviso}</p>}
      </div>
      <span className={`valor shrink-0 text-right font-extrabold ${apagado ? "line-through opacity-50" : ""}`}>{valor}</span>
      <span className="w-9 shrink-0 print:hidden">{acao}</span>
    </li>
  );
}
