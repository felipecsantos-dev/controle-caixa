import { Marca } from "@/components/marca";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_CNPJ, temSessao } from "@/lib/sessao";
import { FormLogin } from "./form-login";

export default async function Login() {
  if (await temSessao()) redirect("/");
  const cnpj = (await cookies()).get(COOKIE_CNPJ)?.value ?? "";

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-fundo p-6">
      <div className="absolute -top-40 -right-32 size-[34rem] rotate-45 rounded-[6rem] bg-gradient-to-br from-laranja to-laranja-claro" />
      <div className="absolute -bottom-48 -left-32 size-[30rem] rotate-45 rounded-[6rem] bg-grafite" />

      <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white shadow-xl">
        <div className="flex justify-center bg-preto px-8 py-8">
          <Marca />
        </div>
        <div className="p-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Controle de caixa</h1>
          <p className="mt-1 mb-6 text-sm text-cinza">Entre com o CNPJ e a senha cadastrados.</p>
          <FormLogin cnpjSalvo={cnpj} />
        </div>
      </div>
    </main>
  );
}
