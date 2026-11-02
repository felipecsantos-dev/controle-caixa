"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { conferirSenha, somenteDigitos } from "@/lib/acesso";
import { calcularTotais, ehMeio } from "@/lib/calculo";
import { dataValida, hoje } from "@/lib/datas";
import { transacao, type Conexao } from "@/lib/db";
import { paraCentavos } from "@/lib/dinheiro";
import { encerrarSessao, exigirSessao, iniciarSessao } from "@/lib/sessao";

export type Estado = { erro?: string; ok?: number };

/** Erro de validação com mensagem que pode ser mostrada ao usuário. */
class Recusa extends Error {}

function texto(form: FormData, campo: string) {
  return String(form.get(campo) ?? "").trim();
}

function obrigatorio(form: FormData, campo: string, rotulo: string, maximo = 200) {
  const v = texto(form, campo);
  if (!v) throw new Recusa(`Preencha ${rotulo}.`);
  if (v.length > maximo) throw new Recusa(`${rotulo} muito longo.`);
  return v;
}

function centavos(form: FormData, campo: string, rotulo: string, zeroPermitido = false) {
  const v = paraCentavos(texto(form, campo));
  if (v === null || (v === 0 && !zeroPermitido)) throw new Recusa(`Informe ${rotulo} válido.`);
  return v;
}

function dataDoForm(form: FormData) {
  const data = texto(form, "data");
  if (!dataValida(data)) throw new Recusa("Data inválida.");
  return data;
}

async function exigirNome(tx: Conexao, tabela: "operadores" | "vendedores", nome: string) {
  const achou = await tx.query(`select 1 from ${tabela} where nome = $1`, [nome]);
  if (!achou.length) throw new Recusa(`Nome não encontrado: ${nome}.`);
}

/** Trava o dia até o fim da transação, para o fechamento não correr com um lançamento. */
async function exigirDiaAberto(tx: Conexao, data: string) {
  const [dia] = await tx.query<{ status: string; valor_abertura: number }>(
    "select status, valor_abertura from dias where data = $1::date for update",
    [data],
  );
  if (!dia) throw new Recusa("Abra o caixa deste dia primeiro.");
  if (dia.status !== "aberto") throw new Recusa("Este caixa está fechado.");
  return dia;
}

async function auditar(
  tx: Conexao,
  quem: string,
  acao: string,
  data: string,
  antes: unknown,
  depois: unknown,
) {
  await tx.query(
    "insert into auditoria (quem, acao, data, antes, depois) values ($1, $2, $3::date, $4::jsonb, $5::jsonb)",
    [quem, acao, data, antes ? JSON.stringify(antes) : null, depois ? JSON.stringify(depois) : null],
  );
}

/** Roda a ação protegida e devolve erro de validação em vez de quebrar a tela. */
async function executar(fn: () => Promise<void>): Promise<Estado> {
  await exigirSessao();
  try {
    await fn();
  } catch (e) {
    if (e instanceof Recusa) return { erro: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: Date.now() };
}

export async function entrar(_: Estado, form: FormData): Promise<Estado> {
  const cnpj = somenteDigitos(texto(form, "cnpj"));
  const resultado = await conferirSenha(String(form.get("senha") ?? ""), cnpj);
  if (!resultado.ok) return { erro: resultado.erro };
  await iniciarSessao(cnpj);
  redirect("/");
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}

export async function abrirCaixa(_: Estado, form: FormData) {
  return executar(async () => {
    const data = dataDoForm(form);
    if (data > hoje()) throw new Recusa("Não é possível abrir o caixa de um dia futuro.");
    const valor = centavos(form, "valor", "o valor de abertura", true);
    const operador = obrigatorio(form, "operador", "quem abriu o caixa");
    await transacao(async (tx) => {
      await exigirNome(tx, "operadores", operador);
      const criados = await tx.query(
        `insert into dias (data, valor_abertura, aberto_por) values ($1::date, $2, $3)
         on conflict (data) do nothing returning data`,
        [data, valor, operador],
      );
      if (!criados.length) throw new Recusa("O caixa deste dia já foi aberto.");
      await auditar(tx, operador, "abertura", data, null, { valor });
    });
  });
}

export async function lancarVenda(_: Estado, form: FormData) {
  return executar(async () => {
    const data = dataDoForm(form);
    const valor = centavos(form, "valor", "o valor");
    const desconto = texto(form, "desconto") ? centavos(form, "desconto", "o desconto", true) : 0;
    const meio = texto(form, "meio");
    if (!ehMeio(meio)) throw new Recusa("Escolha o meio de pagamento.");
    const vendedor = obrigatorio(form, "vendedor", "o vendedor");
    const operador = obrigatorio(form, "operador", "quem lançou");

    let empresa: string | null = null;
    let numero: string | null = null;
    if (meio === "notinha") {
      empresa = obrigatorio(form, "empresa", "o nome da empresa");
      numero = obrigatorio(form, "num_notinha", "o número da notinha", 12);
      if (!/^\d+$/.test(numero)) throw new Recusa("O número da notinha deve ter só dígitos.");
    }

    await transacao(async (tx) => {
      await exigirDiaAberto(tx, data);
      await exigirNome(tx, "vendedores", vendedor);
      await exigirNome(tx, "operadores", operador);
      await tx.query(
        `insert into vendas (data, valor, desconto, meio, vendedor, operador, empresa, num_notinha)
         values ($1::date, $2, $3, $4, $5, $6, $7, $8)`,
        [data, valor, desconto, meio, vendedor, operador, empresa, numero],
      );
    });
  });
}

export async function cancelarVenda(_: Estado, form: FormData) {
  return executar(async () => {
    const data = dataDoForm(form);
    const id = texto(form, "id");
    if (!/^\d+$/.test(id)) throw new Recusa("Venda inválida.");
    const motivo = obrigatorio(form, "motivo", "o motivo", 300);
    const operador = obrigatorio(form, "operador", "o responsável");
    await transacao(async (tx) => {
      await exigirDiaAberto(tx, data);
      await exigirNome(tx, "operadores", operador);
      const [venda] = await tx.query(
        `update vendas set status = 'cancelada', motivo_cancelamento = $1,
           cancelado_por = $2, cancelado_em = now()
         where id = $3::bigint and data = $4::date and status = 'ativa'
         returning valor, meio, vendedor`,
        [motivo, operador, id, data],
      );
      if (!venda) throw new Recusa("Venda não encontrada ou já cancelada.");
      await auditar(tx, operador, "cancelamento", data, venda, { motivo });
    });
  });
}

export async function lancarRetirada(_: Estado, form: FormData) {
  return executar(async () => {
    const data = dataDoForm(form);
    const valor = centavos(form, "valor", "o valor");
    const retiradoPor = obrigatorio(form, "retirado_por", "quem retirou", 100);
    const finalidade = obrigatorio(form, "finalidade", "a finalidade", 300);
    const operador = obrigatorio(form, "operador", "quem lançou");
    await transacao(async (tx) => {
      await exigirDiaAberto(tx, data);
      await exigirNome(tx, "operadores", operador);
      await tx.query(
        `insert into retiradas (data, valor, retirado_por, finalidade, operador)
         values ($1::date, $2, $3, $4, $5)`,
        [data, valor, retiradoPor, finalidade, operador],
      );
      await auditar(tx, operador, "retirada", data, null, { valor, retiradoPor, finalidade });
    });
  });
}

export async function lancarDevolucao(_: Estado, form: FormData) {
  return executar(async () => {
    const data = dataDoForm(form);
    const valor = centavos(form, "valor", "o valor");
    const meio = texto(form, "meio");
    if (!ehMeio(meio)) throw new Recusa("Escolha o meio de pagamento.");
    const motivo = obrigatorio(form, "motivo", "o motivo", 300);
    const responsavel = obrigatorio(form, "responsavel", "o responsável");
    await transacao(async (tx) => {
      await exigirDiaAberto(tx, data);
      await exigirNome(tx, "operadores", responsavel);
      await tx.query(
        `insert into devolucoes (data, valor, meio, motivo, responsavel)
         values ($1::date, $2, $3, $4, $5)`,
        [data, valor, meio, motivo, responsavel],
      );
      await auditar(tx, responsavel, "devolucao", data, null, { valor, meio, motivo });
    });
  });
}

export async function fecharCaixa(_: Estado, form: FormData) {
  return executar(async () => {
    const data = dataDoForm(form);
    const operador = obrigatorio(form, "operador", "quem está fechando");
    const contado = centavos(form, "contado", "o dinheiro contado", true);
    const motivo = texto(form, "motivo");
    const resultado = await conferirSenha(String(form.get("senha") ?? ""));
    if (!resultado.ok) throw new Recusa(resultado.erro);

    await transacao(async (tx) => {
      const dia = await exigirDiaAberto(tx, data);
      await exigirNome(tx, "operadores", operador);
      const vendas = await tx.query<{
        valor: number;
        desconto: number;
        meio: "dinheiro";
        status: string;
      }>("select valor, desconto, meio, status from vendas where data = $1::date", [data]);
      const retiradas = await tx.query<{ valor: number }>(
        "select valor from retiradas where data = $1::date",
        [data],
      );
      const devolucoes = await tx.query<{ valor: number; meio: "dinheiro" }>(
        "select valor, meio from devolucoes where data = $1::date",
        [data],
      );
      const esperado = calcularTotais(dia.valor_abertura, vendas, retiradas, devolucoes).dinheiroEsperado;
      const diferenca = contado - esperado;
      if (diferenca !== 0 && !motivo) throw new Recusa("Há diferença. Explique o motivo.");

      await tx.query(
        `update dias set status = 'fechado', fechado_por = $1, fechado_em = now(),
           dinheiro_esperado = $2, dinheiro_contado = $3, diferenca = $4, motivo_divergencia = $5
         where data = $6::date`,
        [operador, esperado, contado, diferenca, diferenca ? motivo : null, data],
      );
      await auditar(tx, operador, "fechamento", data, null, { esperado, contado, diferenca, motivo });
    });
  });
}

export async function reabrirCaixa(_: Estado, form: FormData) {
  return executar(async () => {
    const data = dataDoForm(form);
    const operador = obrigatorio(form, "operador", "quem está reabrindo");
    const motivo = obrigatorio(form, "motivo", "o motivo", 300);
    const resultado = await conferirSenha(String(form.get("senha") ?? ""));
    if (!resultado.ok) throw new Recusa(resultado.erro);

    await transacao(async (tx) => {
      await exigirNome(tx, "operadores", operador);
      const [antes] = await tx.query(
        `select fechado_por, dinheiro_esperado, dinheiro_contado, diferenca, motivo_divergencia
         from dias where data = $1::date and status = 'fechado' for update`,
        [data],
      );
      if (!antes) throw new Recusa("Este caixa não está fechado.");
      await tx.query(
        `update dias set status = 'aberto', fechado_por = null, fechado_em = null,
           dinheiro_esperado = null, dinheiro_contado = null, diferenca = null,
           motivo_divergencia = null
         where data = $1::date`,
        [data],
      );
      await auditar(tx, operador, "reabertura", data, antes, { motivo });
    });
  });
}
