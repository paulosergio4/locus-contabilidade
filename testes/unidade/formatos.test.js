// Testes dos formatos brasileiros. Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  centavosDeTexto,
  cnpjValido,
  competenciaBR,
  competenciaDeMes,
  cpfValido,
  dataBR,
  diasAte,
  documentoBR,
  iniciais,
  nomeDeArquivoSeguro,
  prazoTexto,
  reais,
  soDigitos,
} from "../../web/compartilhado/js/formatos.js";

test("reais formata centavos", () => {
  assert.equal(reais(405012), "R$ 4.050,12");
  assert.equal(reais(0), "R$ 0,00");
  assert.equal(reais(null), "R$ 0,00");
});

test("centavosDeTexto lê o que a pessoa digita", () => {
  assert.equal(centavosDeTexto("R$ 4.050,12"), 405012);
  assert.equal(centavosDeTexto("4050,12"), 405012);
  assert.equal(centavosDeTexto("4050.12"), 405012);
  assert.equal(centavosDeTexto("1.234.567"), 123456700);
  assert.equal(centavosDeTexto("0,10"), 10);
  assert.equal(centavosDeTexto(""), null);
  assert.equal(centavosDeTexto("abc"), null);
});

test("datas e competências", () => {
  assert.equal(dataBR("2026-11-20"), "20/11/2026");
  assert.equal(dataBR("2026-11-20T03:00:00Z"), "20/11/2026");
  assert.equal(dataBR(null), "");
  assert.equal(competenciaBR("2026-10-01"), "outubro/2026");
  assert.equal(competenciaDeMes("2026-10"), "2026-10-01");
  assert.equal(competenciaDeMes("10/2026"), null);
});

test("prazos contados a partir de hoje", () => {
  const hoje = new Date(2026, 9, 29);
  assert.equal(diasAte("2026-10-29", hoje), 0);
  assert.equal(diasAte("2026-11-20", hoje), 22);
  assert.equal(prazoTexto("2026-10-29", hoje), "vence hoje");
  assert.equal(prazoTexto("2026-10-30", hoje), "vence amanhã");
  assert.equal(prazoTexto("2026-11-03", hoje), "faltam 5 dias");
  assert.equal(prazoTexto("2026-10-27", hoje), "venceu há 2 dias");
});

test("CNPJ e CPF", () => {
  assert.equal(cnpjValido("11.222.333/0001-81"), true);
  assert.equal(cnpjValido("11.222.333/0001-82"), false);
  assert.equal(cnpjValido("00000000000000"), false);
  assert.equal(cpfValido("529.982.247-25"), true);
  assert.equal(cpfValido("529.982.247-24"), false);
  assert.equal(cpfValido("11111111111"), false);
  assert.equal(documentoBR("11222333000181"), "11.222.333/0001-81");
  assert.equal(documentoBR("52998224725"), "529.982.247-25");
  assert.equal(soDigitos("11.222.333/0001-81"), "11222333000181");
});

test("nomes de arquivo e iniciais", () => {
  assert.equal(nomeDeArquivoSeguro("Extrato Itaú setembro.pdf"), "Extrato-Itau-setembro.pdf");
  assert.equal(nomeDeArquivoSeguro("../../senha.txt").includes("/"), false);
  assert.equal(nomeDeArquivoSeguro("///"), "arquivo");
  assert.equal(iniciais("Mercado Bom Preço"), "MB");
  assert.equal(iniciais("Ana"), "A");
});
