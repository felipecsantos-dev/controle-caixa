import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

export type Conexao = {
  query<T = Record<string, unknown>>(texto: string, params?: unknown[]): Promise<T[]>;
};

type Banco = Conexao & {
  transacao<R>(fn: (tx: Conexao) => Promise<R>): Promise<R>;
  executar(texto: string): Promise<void>;
  fechar(): Promise<void>;
};

function postgresRemoto(url: string): Banco {
  // prepare: false é exigido pelo pooler de transações do Supabase.
  const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 15 });
  // O pooler do Supabase deixa consultas simultâneas sem resposta. Uma por vez evita o travamento.
  let fila: Promise<unknown> = Promise.resolve();
  const emFila = <R,>(tarefa: () => Promise<R>): Promise<R> => {
    const resultado = fila.then(tarefa, tarefa);
    fila = resultado.catch(() => undefined);
    return resultado;
  };
  const envolver = (c: postgres.Sql | postgres.TransactionSql, serial: boolean): Conexao => ({
    query: <T,>(texto: string, params: unknown[] = []) => {
      const executar = async () => (await c.unsafe(texto, params as never[])) as unknown as T[];
      return serial ? emFila(executar) : executar();
    },
  });
  return {
    ...envolver(sql, true),
    transacao: (fn) => emFila(async () => (await sql.begin((tx) => fn(envolver(tx, false)))) as never),
    executar: (texto) => emFila(async () => void (await sql.unsafe(texto))),
    fechar: () => sql.end(),
  };
}

async function pgliteLocal(): Promise<Banco> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pasta = join(process.cwd(), ".data");
  mkdirSync(pasta, { recursive: true });
  const db = await PGlite.create(join(pasta, "pglite"));
  await db.exec(readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8"));
  return {
    query: async <T,>(texto: string, params: unknown[] = []) =>
      (await db.query<T>(texto, params)).rows,
    transacao: async (fn) =>
      (await db.transaction((tx) =>
        fn({
          query: async <T,>(texto: string, params: unknown[] = []) =>
            (await tx.query<T>(texto, params)).rows,
        }),
      )) as never,
    executar: async (texto) => void (await db.exec(texto)),
    fechar: () => db.close(),
  };
}

const global_ = globalThis as unknown as { __banco?: Promise<Banco> };

export function banco(): Promise<Banco> {
  if (!global_.__banco) {
    const url = process.env.DATABASE_URL;
    if (!url && process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL não configurada.");
    }
    global_.__banco = url ? Promise.resolve(postgresRemoto(url)) : pgliteLocal();
  }
  return global_.__banco;
}

export async function consultar<T = Record<string, unknown>>(texto: string, params?: unknown[]) {
  return (await banco()).query<T>(texto, params);
}

export async function transacao<R>(fn: (tx: Conexao) => Promise<R>) {
  return (await banco()).transacao(fn);
}
