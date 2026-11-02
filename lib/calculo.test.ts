import assert from "node:assert/strict";
import { test } from "node:test";
import { calcularTotais } from "./calculo";
import { dataValida, fimDoDia, hoje, semanasDoMes, somarMeses } from "./datas";
import { paraCentavos } from "./dinheiro";

const venda = (valor: number, meio: "dinheiro" | "pix" | "cartao" | "notinha", extra = {}) => ({
  valor,
  meio,
  desconto: 0,
  status: "ativa",
  ...extra,
});

test("dinheiro esperado = abertura + vendas em dinheiro - retiradas - devoluções em dinheiro", () => {
  const t = calcularTotais(
    20000,
    [venda(5000, "dinheiro"), venda(3000, "pix"), venda(7000, "dinheiro")],
    [{ valor: 2000 }],
    [{ valor: 1000, meio: "dinheiro" }, { valor: 500, meio: "pix" }],
  );
  assert.equal(t.dinheiroEsperado, 20000 + 12000 - 2000 - 1000);
  assert.equal(t.porMeio.dinheiro, 11000);
  assert.equal(t.porMeio.pix, 2500);
  assert.equal(t.total, 13500);
});

test("venda cancelada não entra em nenhum total", () => {
  const t = calcularTotais(0, [venda(5000, "dinheiro", { status: "cancelada", desconto: 100 })], [], []);
  assert.equal(t.total, 0);
  assert.equal(t.dinheiroEsperado, 0);
  assert.equal(t.quantidade.dinheiro, 0);
  assert.equal(t.descontos, 0);
});

test("desconto é só registro e não altera o valor pago", () => {
  const t = calcularTotais(0, [venda(9000, "cartao", { desconto: 1000 })], [], []);
  assert.equal(t.porMeio.cartao, 9000);
  assert.equal(t.descontos, 1000);
});

test("Pix, cartão e notinha não entram no dinheiro da gaveta", () => {
  const t = calcularTotais(1000, [venda(1, "pix"), venda(2, "cartao"), venda(3, "notinha")], [], []);
  assert.equal(t.dinheiroEsperado, 1000);
});

test("paraCentavos entende os formatos digitados no caixa", () => {
  const casos: [string, number | null][] = [
    ["50", 5000],
    ["12,5", 1250],
    ["12,50", 1250],
    ["1.234,56", 123456],
    ["1.234", 123400],
    ["12.50", 1250],
    ["R$ 10,00", 1000],
    ["0,07", 7],
    ["0,29", 29],
    ["1,1,1", null],
    ["abc", null],
    ["-5", null],
    ["10,123", null],
    ["", null],
  ];
  for (const [entrada, esperado] of casos) assert.equal(paraCentavos(entrada), esperado, entrada);
});

test("hoje usa o fuso do Brasil mesmo com o servidor em UTC", () => {
  // 01:30 UTC do dia 1 ainda é 22:30 do dia anterior no horário de Brasília.
  assert.equal(hoje(new Date("2026-11-01T01:30:00Z")), "2026-10-31");
  assert.equal(hoje(new Date("2026-11-01T03:30:00Z")), "2026-11-01");
  assert.equal(fimDoDia(new Date("2026-11-01T01:30:00Z")).toISOString(), "2026-11-01T02:59:59.000Z");
});

test("datas e meses", () => {
  assert.equal(dataValida("2026-02-30"), false);
  assert.equal(dataValida("2026-02-28"), true);
  assert.equal(somarMeses("2026-12", 1), "2027-01");
  assert.equal(somarMeses("2026-01", -1), "2025-12");
  const semanas = semanasDoMes("2026-10"); // outubro de 2026 começa numa quinta
  assert.equal(semanas[0][4], "2026-10-01");
  assert.equal(semanas.flat().filter(Boolean).length, 31);
  assert.ok(semanas.every((s) => s.length === 7));
});
