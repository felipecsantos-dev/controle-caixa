import bcrypt from "bcryptjs";
import { consultar } from "./db";

const MAX_TENTATIVAS = 5;
const MINUTOS_BLOQUEIO = 5;

export type ResultadoSenha = { ok: true } | { ok: false; erro: string };

export function somenteDigitos(texto: string) {
  return texto.replace(/\D/g, "");
}

/**
 * Confere a senha única. Login e fechamento dividem o mesmo contador,
 * então errar em qualquer um dos dois conta para o bloqueio.
 */
export async function conferirSenha(senha: string, cnpj?: string): Promise<ResultadoSenha> {
  const [acesso] = await consultar<{
    cnpj: string;
    senha_hash: string;
    bloqueado: boolean;
  }>("select cnpj, senha_hash, coalesce(bloqueado_ate > now(), false) as bloqueado from acesso");

  if (!acesso) return { ok: false, erro: "Acesso ainda não configurado. Rode npm run preparar." };
  if (acesso.bloqueado) {
    return {
      ok: false,
      erro: `Muitas tentativas erradas. Aguarde até ${MINUTOS_BLOQUEIO} minutos e tente de novo.`,
    };
  }

  const certa = await bcrypt.compare(senha, acesso.senha_hash);
  if (certa && (cnpj === undefined || cnpj === acesso.cnpj)) {
    await consultar("update acesso set tentativas = 0, bloqueado_ate = null");
    return { ok: true };
  }

  const [{ bloqueou }] = await consultar<{ bloqueou: boolean }>(
    `update acesso set
       tentativas = case when tentativas + 1 >= $1 then 0 else tentativas + 1 end,
       bloqueado_ate = case when tentativas + 1 >= $1
         then now() + make_interval(mins => $2) else null end
     returning bloqueado_ate is not null as bloqueou`,
    [MAX_TENTATIVAS, MINUTOS_BLOQUEIO],
  );
  return {
    ok: false,
    erro: bloqueou
      ? `Muitas tentativas erradas. Aguarde ${MINUTOS_BLOQUEIO} minutos e tente de novo.`
      : cnpj === undefined
        ? "Senha incorreta."
        : "CNPJ ou senha incorretos.",
  };
}
