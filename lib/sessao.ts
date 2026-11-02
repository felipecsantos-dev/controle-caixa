import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { fimDoDia } from "./datas";

const COOKIE_SESSAO = "caixa_sessao";
export const COOKIE_CNPJ = "caixa_cnpj";

function segredo() {
  const s = process.env.SESSION_SECRET;
  if (s) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET não configurada.");
  return new TextEncoder().encode("somente-para-desenvolvimento-local");
}

/** A sessão vale até o fim do dia. No dia seguinte a senha é pedida de novo. */
export async function iniciarSessao(cnpj: string) {
  const expira = fimDoDia();
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expira)
    .sign(segredo());
  const jar = await cookies();
  const seguro = process.env.NODE_ENV === "production";
  jar.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: seguro,
    path: "/",
    expires: expira,
  });
  jar.set(COOKIE_CNPJ, cnpj, {
    httpOnly: true,
    sameSite: "lax",
    secure: seguro,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function encerrarSessao() {
  (await cookies()).delete(COOKIE_SESSAO);
}

export async function temSessao() {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, segredo(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function exigirSessao() {
  if (!(await temSessao())) redirect("/login");
}
