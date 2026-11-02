"use client";

import { useActionState, useState } from "react";
import { entrar, type Estado } from "@/app/acoes";
import { Botao, Campo, Entrada, MensagemErro } from "@/components/ui";

function mascararCnpj(texto: string) {
  const d = texto.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function FormLogin({ cnpjSalvo }: { cnpjSalvo: string }) {
  const [estado, acao, enviando] = useActionState<Estado, FormData>(entrar, {});
  const [cnpj, setCnpj] = useState(mascararCnpj(cnpjSalvo));

  return (
    <form action={acao} className="space-y-4">
      <Campo rotulo="CNPJ">
        <Entrada
          name="cnpj"
          value={cnpj}
          onChange={(e) => setCnpj(mascararCnpj(e.target.value))}
          inputMode="numeric"
          autoComplete="username"
          placeholder="00.000.000/0000-00"
          autoFocus={!cnpjSalvo}
          required
        />
      </Campo>
      <Campo rotulo="Senha">
        <Entrada
          name="senha"
          type="password"
          autoComplete="current-password"
          autoFocus={!!cnpjSalvo}
          required
        />
      </Campo>
      <MensagemErro erro={estado.erro} />
      <Botao type="submit" className="w-full" disabled={enviando}>
        {enviando ? "Entrando..." : "Entrar"}
      </Botao>
    </form>
  );
}
