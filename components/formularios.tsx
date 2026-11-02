"use client";

import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import {
  abrirCaixa,
  cancelarVenda,
  fecharCaixa,
  lancarDevolucao,
  lancarRetirada,
  lancarVenda,
  reabrirCaixa,
  type Estado,
} from "@/app/acoes";
import { ICONE_MEIO } from "@/components/icones-meio";
import { Botao, Campo, Entrada, EntradaValor, MensagemErro, Modal, Selecao } from "@/components/ui";
import { MEIOS, NOME_MEIO, type Meio, type Totais } from "@/lib/calculo";
import { brl, paraCentavos } from "@/lib/dinheiro";

type Acao = (estado: Estado, form: FormData) => Promise<Estado>;
export type Nomes = { operadores: string[]; vendedores: string[] };


const CHAVE_OPERADOR = "caixa_operador";

/** Com um só computador, lembrar quem está no caixa evita selecionar a cada venda. */
function operadorSalvo() {
  try {
    return localStorage.getItem(CHAVE_OPERADOR) ?? "";
  } catch {
    return "";
  }
}

function SelecaoOperador({ nomes, name = "operador", rotulo }: { nomes: string[]; name?: string; rotulo: string }) {
  const [valor, setValor] = useState(operadorSalvo);
  return (
    <Campo rotulo={rotulo}>
      <Selecao
        name={name}
        opcoes={nomes}
        value={valor}
        required
        onChange={(e) => {
          setValor(e.target.value);
          try {
            localStorage.setItem(CHAVE_OPERADOR, e.target.value);
          } catch {}
        }}
      />
    </Campo>
  );
}

function useAcao(acao: Acao, aoConcluir: () => void) {
  const [estado, despachar, enviando] = useActionState<Estado, FormData>(acao, {});
  useEffect(() => {
    if (estado.ok) aoConcluir();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage só ao resultado da ação
  }, [estado.ok]);
  // Enviar por onSubmit evita que o React limpe o formulário: após um erro, nada do que foi digitado se perde.
  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => despachar(dados));
  }
  return { estado, aoEnviar, enviando };
}

function EscolhaMeio({ valor, aoEscolher }: { valor: Meio | ""; aoEscolher: (m: Meio) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">Meio de pagamento</legend>
      <input type="hidden" name="meio" value={valor} />
      <div className="grid grid-cols-4 gap-2">
        {MEIOS.map((m) => {
          const Icone = ICONE_MEIO[m];
          const ativo = valor === m;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={ativo}
              onClick={() => aoEscolher(m)}
              className={`flex h-[4.5rem] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl text-xs font-bold transition-colors ${
                ativo ? "bg-laranja text-preto" : "bg-fundo text-preto hover:bg-borda"
              }`}
            >
              <Icone size={22} />
              {NOME_MEIO[m]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FormAbertura({ data, operadores }: { data: string; operadores: string[] }) {
  const { estado, aoEnviar, enviando } = useAcao(abrirCaixa, () => {});
  return (
    <form onSubmit={aoEnviar} className="space-y-4">
      <input type="hidden" name="data" value={data} />
      <Campo rotulo="Valor de abertura do caixa">
        <EntradaValor name="valor" required autoFocus />
      </Campo>
      <SelecaoOperador nomes={operadores} rotulo="Quem está abrindo" />
      <MensagemErro erro={estado.erro} />
      <Botao type="submit" className="w-full" disabled={enviando}>
        {enviando ? "Abrindo..." : "Abrir caixa"}
      </Botao>
    </form>
  );
}

export function ModalVenda({ data, nomes, aoFechar }: { data: string; nomes: Nomes; aoFechar: () => void }) {
  const { estado, aoEnviar, enviando } = useAcao(lancarVenda, aoFechar);
  const [meio, setMeio] = useState<Meio | "">("");

  return (
    <Modal titulo="Nova venda" aoFechar={aoFechar}>
      <form onSubmit={aoEnviar} className="space-y-4">
        <input type="hidden" name="data" value={data} />
        <Campo rotulo="Valor pago pelo cliente">
          <EntradaValor name="valor" required autoFocus />
        </Campo>
        <EscolhaMeio valor={meio} aoEscolher={setMeio} />
        <Campo rotulo="Vendedor">
          <Selecao name="vendedor" opcoes={nomes.vendedores} required />
        </Campo>
        {meio === "notinha" && (
          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <Campo rotulo="Empresa">
              <Entrada name="empresa" required maxLength={200} />
            </Campo>
            <Campo rotulo="Nº da notinha">
              <Entrada name="num_notinha" required inputMode="numeric" pattern="\d+" maxLength={12} title="Somente dígitos" />
            </Campo>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Desconto (opcional)" dica="Só registro, não muda o valor pago.">
            <EntradaValor name="desconto" />
          </Campo>
          <SelecaoOperador nomes={nomes.operadores} rotulo="Quem lançou" />
        </div>
        <MensagemErro erro={estado.erro} />
        <Botao type="submit" className="w-full" disabled={enviando || !meio}>
          {enviando ? "Salvando..." : meio ? "Lançar venda" : "Escolha o meio de pagamento"}
        </Botao>
      </form>
    </Modal>
  );
}

export function ModalRetirada({ data, nomes, aoFechar }: { data: string; nomes: Nomes; aoFechar: () => void }) {
  const { estado, aoEnviar, enviando } = useAcao(lancarRetirada, aoFechar);
  return (
    <Modal titulo="Retirada de dinheiro" aoFechar={aoFechar}>
      <form onSubmit={aoEnviar} className="space-y-4">
        <input type="hidden" name="data" value={data} />
        <p className="rounded-xl bg-fundo px-3.5 py-2.5 text-sm text-cinza">
          A data e o horário são registrados automaticamente.
        </p>
        <Campo rotulo="Valor retirado">
          <EntradaValor name="valor" required autoFocus />
        </Campo>
        <Campo rotulo="Quem retirou">
          <Entrada name="retirado_por" required maxLength={100} list="nomes-pessoas" autoComplete="off" />
          <datalist id="nomes-pessoas">
            {[...new Set([...nomes.operadores, ...nomes.vendedores])].map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Campo>
        <Campo rotulo="Finalidade" dica="Para onde foi esse dinheiro.">
          <Entrada name="finalidade" required maxLength={300} />
        </Campo>
        <SelecaoOperador nomes={nomes.operadores} rotulo="Quem lançou" />
        <MensagemErro erro={estado.erro} />
        <Botao type="submit" className="w-full" disabled={enviando}>
          {enviando ? "Salvando..." : "Registrar retirada"}
        </Botao>
      </form>
    </Modal>
  );
}

export function ModalDevolucao({ data, nomes, aoFechar }: { data: string; nomes: Nomes; aoFechar: () => void }) {
  const { estado, aoEnviar, enviando } = useAcao(lancarDevolucao, aoFechar);
  const [meio, setMeio] = useState<Meio | "">("");
  return (
    <Modal titulo="Devolução" aoFechar={aoFechar}>
      <form onSubmit={aoEnviar} className="space-y-4">
        <input type="hidden" name="data" value={data} />
        <Campo rotulo="Valor devolvido">
          <EntradaValor name="valor" required autoFocus />
        </Campo>
        <EscolhaMeio valor={meio} aoEscolher={setMeio} />
        <Campo rotulo="Motivo">
          <Entrada name="motivo" required maxLength={300} />
        </Campo>
        <SelecaoOperador nomes={nomes.operadores} name="responsavel" rotulo="Responsável" />
        <MensagemErro erro={estado.erro} />
        <Botao type="submit" className="w-full" disabled={enviando || !meio}>
          {enviando ? "Salvando..." : meio ? "Registrar devolução" : "Escolha o meio de pagamento"}
        </Botao>
      </form>
    </Modal>
  );
}

export function ModalCancelarVenda({
  data,
  id,
  descricao,
  operadores,
  aoFechar,
}: {
  data: string;
  id: string;
  descricao: string;
  operadores: string[];
  aoFechar: () => void;
}) {
  const { estado, aoEnviar, enviando } = useAcao(cancelarVenda, aoFechar);
  return (
    <Modal titulo="Cancelar venda" aoFechar={aoFechar}>
      <form onSubmit={aoEnviar} className="space-y-4">
        <input type="hidden" name="data" value={data} />
        <input type="hidden" name="id" value={id} />
        <p className="rounded-xl bg-fundo px-3.5 py-2.5 text-sm font-semibold">{descricao}</p>
        <Campo rotulo="Motivo">
          <Entrada name="motivo" required maxLength={300} autoFocus />
        </Campo>
        <SelecaoOperador nomes={operadores} rotulo="Responsável" />
        <MensagemErro erro={estado.erro} />
        <Botao type="submit" variante="perigo" className="w-full" disabled={enviando}>
          {enviando ? "Cancelando..." : "Cancelar venda"}
        </Botao>
      </form>
    </Modal>
  );
}

function LinhaConta({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-1 text-sm ${forte ? "font-extrabold" : ""}`}>
      <span>{rotulo}</span>
      <span className="valor">{valor}</span>
    </div>
  );
}

export function ModalFechamento({
  data,
  abertura,
  totais,
  operadores,
  aoFechar,
}: {
  data: string;
  abertura: number;
  totais: Totais;
  operadores: string[];
  aoFechar: () => void;
}) {
  const { estado, aoEnviar, enviando } = useAcao(fecharCaixa, aoFechar);
  const [contado, setContado] = useState("");
  const centavos = paraCentavos(contado);
  const diferenca = centavos === null ? null : centavos - totais.dinheiroEsperado;

  return (
    <Modal titulo="Fechar caixa" aoFechar={aoFechar}>
      <form onSubmit={aoEnviar} className="space-y-4">
        <input type="hidden" name="data" value={data} />
        <div className="rounded-2xl bg-fundo px-4 py-3">
          <LinhaConta rotulo="Abertura" valor={brl(abertura)} />
          <LinhaConta rotulo="+ Vendas em dinheiro" valor={brl(totais.vendasDinheiro)} />
          <LinhaConta rotulo="− Retiradas" valor={brl(totais.retiradas)} />
          <LinhaConta rotulo="− Devoluções em dinheiro" valor={brl(totais.devolucoesDinheiro)} />
          <div className="mt-1 border-t border-borda pt-1">
            <LinhaConta rotulo="Dinheiro esperado" valor={brl(totais.dinheiroEsperado)} forte />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {(["pix", "cartao", "notinha"] as const).map((m) => (
            <div key={m} className="rounded-2xl ring-1 ring-borda px-2 py-2">
              <p className="text-xs text-cinza">{NOME_MEIO[m]}</p>
              <p className="valor text-sm font-bold">{brl(totais.porMeio[m])}</p>
            </div>
          ))}
        </div>

        <Campo rotulo="Dinheiro contado">
          <EntradaValor name="contado" required autoFocus value={contado} onChange={(e) => setContado(e.target.value)} />
        </Campo>

        {diferenca !== null && (
          <p
            className={`rounded-xl px-3.5 py-2.5 text-sm font-bold ${
              diferenca === 0 ? "bg-ok-suave text-ok" : "bg-erro-suave text-erro"
            }`}
          >
            {diferenca === 0
              ? "Valores batem."
              : `${diferenca > 0 ? "Sobra" : "Falta"} de ${brl(Math.abs(diferenca))}`}
          </p>
        )}
        {diferenca !== null && diferenca !== 0 && (
          <Campo rotulo="Motivo da diferença">
            <Entrada name="motivo" required maxLength={300} />
          </Campo>
        )}

        <SelecaoOperador nomes={operadores} rotulo="Quem está fechando" />
        <Campo rotulo="Senha">
          <Entrada name="senha" type="password" required autoComplete="off" />
        </Campo>
        <MensagemErro erro={estado.erro} />
        <Botao type="submit" variante="preto" className="w-full" disabled={enviando}>
          {enviando ? "Fechando..." : "Fechar caixa"}
        </Botao>
      </form>
    </Modal>
  );
}

export function ModalReabrir({
  data,
  operadores,
  aoFechar,
}: {
  data: string;
  operadores: string[];
  aoFechar: () => void;
}) {
  const { estado, aoEnviar, enviando } = useAcao(reabrirCaixa, aoFechar);
  return (
    <Modal titulo="Reabrir caixa" aoFechar={aoFechar}>
      <form onSubmit={aoEnviar} className="space-y-4">
        <input type="hidden" name="data" value={data} />
        <p className="rounded-xl bg-fundo px-3.5 py-2.5 text-sm text-cinza">
          O fechamento atual fica guardado no histórico.
        </p>
        <Campo rotulo="Motivo">
          <Entrada name="motivo" required maxLength={300} autoFocus />
        </Campo>
        <SelecaoOperador nomes={operadores} rotulo="Quem está reabrindo" />
        <Campo rotulo="Senha">
          <Entrada name="senha" type="password" required autoComplete="off" />
        </Campo>
        <MensagemErro erro={estado.erro} />
        <Botao type="submit" variante="preto" className="w-full" disabled={enviando}>
          {enviando ? "Reabrindo..." : "Reabrir caixa"}
        </Botao>
      </form>
    </Modal>
  );
}
