import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hoje } from "@/lib/datas";

export default async function Inicio() {
  // Sem isso a página é gerada no build e "hoje" fica preso na data do deploy.
  await connection();
  redirect(`/dia/${hoje()}`);
}
