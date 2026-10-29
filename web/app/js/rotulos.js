/**
 * Textos que aparecem na tela para cada código do banco.
 * Um lugar só para traduzir status e categorias: ao criar um valor novo no banco,
 * acrescente aqui também.
 */

/** @typedef {"ok" | "due" | "bad" | "new"} TomPill */

/** @type {Record<string, [string, TomPill]>} */
export const STATUS_GUIA = {
  a_pagar: ["A pagar", "due"],
  paga: ["Paga", "ok"],
  cancelada: ["Cancelada", "bad"],
};

/** @type {Record<string, [string, TomPill]>} */
export const STATUS_DOCUMENTO = {
  recebido: ["Recebido", "new"],
  em_analise: ["Em análise", "due"],
  processado: ["Conferido", "ok"],
  recusado: ["Recusado", "bad"],
};

/** @type {Record<string, [string, TomPill]>} */
export const STATUS_CHAMADO = {
  aberto: ["Aberto", "new"],
  em_atendimento: ["Em atendimento", "due"],
  aguardando_cliente: ["Esperando você", "bad"],
  resolvido: ["Resolvido", "ok"],
};

/** @type {Record<string, [string, TomPill]>} */
export const STATUS_CONTATO = {
  novo: ["Novo", "new"],
  em_contato: ["Em contato", "due"],
  virou_cliente: ["Virou cliente", "ok"],
  descartado: ["Descartado", "bad"],
};

/** @type {Record<string, string>} */
export const CATEGORIA_DOCUMENTO = {
  extrato: "Extrato bancário",
  nota_compra: "Nota de compra",
  nota_venda: "Nota de venda",
  folha: "Folha e funcionários",
  contrato: "Contrato",
  outro: "Outro",
};

/** @type {Record<string, string>} */
export const CATEGORIA_ENTREGA = {
  diagnostico: "Painel de diagnóstico",
  balancete: "Balancete",
  dre: "DRE",
  folha: "Folha e holerites",
  contrato: "Contrato",
  certidao: "Certidão",
  outro: "Outro",
};

/** @type {Record<string, string>} */
export const CATEGORIA_CHAMADO = {
  admissao: "Admissão",
  rescisao: "Rescisão",
  ferias: "Férias",
  duvida: "Dúvida",
  outro: "Outro",
};

/** @type {Record<string, string>} */
export const REGIME = {
  mei: "MEI",
  simples: "Simples Nacional",
  presumido: "Lucro Presumido",
  real: "Lucro Real",
  pessoa_fisica: "Pessoa física",
  outro: "Outro",
};

export const TIPOS_DE_GUIA = [
  "DAS · Simples Nacional",
  "DAS-MEI",
  "FGTS Digital",
  "DCTFWeb · INSS",
  "ISS",
  "ICMS",
  "IRPJ",
  "CSLL",
  "PIS e COFINS",
  "IRPF · carnê-leão",
  "Parcelamento",
  "Outro",
];
