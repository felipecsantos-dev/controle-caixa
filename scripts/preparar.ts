// Cria as tabelas e define o CNPJ e a senha de acesso.
// Use: npm run preparar (pede os dados no terminal).
// Sem DATABASE_URL, atua no banco local de desenvolvimento.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import bcrypt from "bcryptjs";
import { somenteDigitos } from "../lib/acesso";
import { banco } from "../lib/db";

async function pedir(pergunta: string) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const resposta = await rl.question(pergunta);
  rl.close();
  return resposta.trim();
}

async function main() {
  const db = await banco();
  await db.executar(readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8"));
  console.log("Tabelas prontas.");

  const cnpj = somenteDigitos(process.env.ACESSO_CNPJ ?? (await pedir("CNPJ: ")));
  if (cnpj.length !== 14) throw new Error("O CNPJ deve ter 14 dígitos.");
  const senha = process.env.ACESSO_SENHA ?? (await pedir("Senha (mínimo 8 caracteres): "));
  if (senha.length < 8) throw new Error("A senha deve ter pelo menos 8 caracteres.");

  await db.query(
    `insert into acesso (id, cnpj, senha_hash) values (1, $1, $2)
     on conflict (id) do update set cnpj = $1, senha_hash = $2, tentativas = 0, bloqueado_ate = null`,
    [cnpj, await bcrypt.hash(senha, 12)],
  );
  console.log("Acesso definido.");
  await db.fechar();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
