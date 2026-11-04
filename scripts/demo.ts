// Carrega a demonstração: cria as tabelas, define o acesso de exemplo e
// recria dias, vendas, retiradas e devoluções com dados fictícios.
// Use: npm run demo
// Apaga os lançamentos existentes. Por isso só roda em banco vazio ou
// em banco que já tem o acesso de demonstração, e recusa qualquer outro.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { hoje, somarDias } from "../lib/datas";
import { banco } from "../lib/db";
import { DEMO_CNPJ, DEMO_SENHA } from "../lib/demo";

const OPERADORES = ["Operador 1", "Operador 2", "Operador 3", "Operador 4"];
const VENDEDORES = ["Vendedor 1", "Vendedor 2", "Vendedor 3", "Vendedor 4", "Vendedor 5"];
const MEIOS = ["dinheiro", "pix", "cartao", "notinha"];
const ABERTURA = 20000;
const DIAS_ANTERIORES = 40;

// Gerador simples e fixo, para a demonstração sair igual a cada carga.
let semente = 7;
function sorteio() {
  semente = (semente * 9301 + 49297) % 233280;
  return semente / 233280;
}

async function main() {
  const db = await banco();
  await db.executar(readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8"));

  const [acesso] = await db.query<{ cnpj: string }>("select cnpj from acesso");
  if (acesso && acesso.cnpj !== DEMO_CNPJ) {
    throw new Error("Este banco tem outro acesso cadastrado. A demonstração não roda nele.");
  }

  await db.query(
    `insert into acesso (id, cnpj, senha_hash) values (1, $1, $2)
     on conflict (id) do update set cnpj = $1, senha_hash = $2, tentativas = 0, bloqueado_ate = null`,
    [DEMO_CNPJ, await bcrypt.hash(DEMO_SENHA, 12)],
  );

  await db.transacao(async (tx) => {
    for (const tabela of ["devolucoes", "retiradas", "vendas", "dias", "auditoria"]) {
      await tx.query(`delete from ${tabela}`);
    }

    const hojeStr = hoje();
    for (let n = DIAS_ANTERIORES; n >= 0; n--) {
      const data = somarDias(hojeStr, -n);
      const diaSemana = new Date(`${data}T12:00:00Z`).getUTCDay();
      if (diaSemana === 0) continue;

      const operador = OPERADORES[n % 4];
      const aberto = n === 0;
      await tx.query("insert into dias (data, valor_abertura, aberto_por) values ($1::date, $2, $3)", [
        data,
        ABERTURA,
        operador,
      ]);

      const quantidade = 6 + Math.floor(sorteio() * 6);
      let dinheiro = 0;
      for (let i = 0; i < quantidade; i++) {
        const meio = MEIOS[Math.floor(sorteio() * MEIOS.length)];
        const valor = (30 + Math.floor(sorteio() * 900)) * 10 + (sorteio() > 0.5 ? 90 : 0);
        const hora = `${String(8 + Math.floor((i * 9) / quantidade)).padStart(2, "0")}:${String(
          Math.floor(sorteio() * 59),
        ).padStart(2, "0")}:00-03`;
        const empresa = meio === "notinha" ? `Empresa Exemplo ${1 + Math.floor(sorteio() * 3)}` : null;
        const notinha = meio === "notinha" ? String(40000 + Math.floor(sorteio() * 9999)) : null;
        await tx.query(
          `insert into vendas (data, criado_em, valor, desconto, meio, vendedor, operador, empresa, num_notinha)
           values ($1::date, ($1 || ' ' || $2)::timestamptz, $3, $4, $5, $6, $7, $8, $9)`,
          [
            data,
            hora,
            valor,
            sorteio() > 0.8 ? 500 : 0,
            meio,
            VENDEDORES[Math.floor(sorteio() * VENDEDORES.length)],
            operador,
            empresa,
            notinha,
          ],
        );
        if (meio === "dinheiro") dinheiro += valor;
      }

      const retirada = n % 5 === 0 && n > 0 ? 15000 : 0;
      if (retirada) {
        await tx.query(
          `insert into retiradas (data, criado_em, valor, retirado_por, finalidade, operador)
           values ($1::date, ($1 || ' 15:20:00-03')::timestamptz, $2, 'Gerente', 'Pagamento de fornecedor', $3)`,
          [data, retirada, operador],
        );
      }

      if (!aberto) {
        const esperado = ABERTURA + dinheiro - retirada;
        const diferenca = n % 7 === 0 ? -1500 : 0;
        await tx.query(
          `update dias set status = 'fechado', fechado_por = $2,
             fechado_em = ($1 || ' 18:05:00-03')::timestamptz,
             dinheiro_esperado = $3, dinheiro_contado = $4, diferenca = $5, motivo_divergencia = $6
           where data = $1::date`,
          [data, OPERADORES[(n + 1) % 4], esperado, esperado + diferenca, diferenca, diferenca ? "Troco entregue a mais" : null],
        );
      }
    }
  });

  console.log("Demonstração carregada.");
  await db.fechar();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
