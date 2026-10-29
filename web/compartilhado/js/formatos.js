/**
 * Formatos brasileiros usados em todo o sistema: dinheiro, datas, CNPJ e CPF.
 * Funções puras, sem acesso ao navegador, testadas em testes/unidade/formatos.test.js.
 */

const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/**
 * Centavos para texto em reais: 405012 → "R$ 4.050,12".
 * @param {number | null | undefined} centavos
 * @returns {string}
 */
export function reais(centavos) {
  return REAIS.format((centavos ?? 0) / 100).replace(/\u00a0/g, " ");
}

/**
 * Texto digitado para centavos: "R$ 4.050,12" → 405012. Aceita "4050,12" e "4050.12".
 * @param {string} texto
 * @returns {number | null} null quando não há número
 */
export function centavosDeTexto(texto) {
  const limpo = String(texto ?? "")
    .replace(/[^\d,.-]/g, "")
    .trim();
  if (!/\d/.test(limpo)) return null;
  let normal = limpo;
  if (limpo.includes(",")) normal = limpo.replace(/\./g, "").replace(",", ".");
  else if ((limpo.match(/\./g) ?? []).length > 1) normal = limpo.replace(/\./g, "");
  const valor = Number(normal);
  return Number.isFinite(valor) ? Math.round(valor * 100) : null;
}

/**
 * Data ISO (AAAA-MM-DD) para DD/MM/AAAA, sem erro de fuso horário.
 * @param {string | null | undefined} iso
 * @returns {string}
 */
export function dataBR(iso) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Data e hora de um timestamp, no horário de Brasília.
 * @param {string | null | undefined} iso
 * @returns {string}
 */
export function dataHoraBR(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Competência (primeiro dia do mês) para "outubro/2026".
 * @param {string | null | undefined} iso
 * @returns {string}
 */
export function competenciaBR(iso) {
  if (!iso) return "";
  const [ano, mes] = iso.split("-");
  return `${MESES[Number(mes) - 1]}/${ano}`;
}

/**
 * Valor de um <input type="month"> ("2026-10") para competência ("2026-10-01").
 * @param {string} mes
 * @returns {string | null}
 */
export function competenciaDeMes(mes) {
  return /^\d{4}-\d{2}$/.test(mes) ? `${mes}-01` : null;
}

/**
 * Dias corridos de hoje até a data (negativo = já passou).
 * @param {string} iso data AAAA-MM-DD
 * @param {Date} [hoje]
 * @returns {number}
 */
export function diasAte(iso, hoje = new Date()) {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  const alvo = Date.UTC(ano, mes - 1, dia);
  const base = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((alvo - base) / 86400000);
}

/**
 * Texto amigável para o prazo: "vence hoje", "faltam 3 dias", "venceu há 2 dias".
 * @param {string} iso
 * @param {Date} [hoje]
 * @returns {string}
 */
export function prazoTexto(iso, hoje) {
  const dias = diasAte(iso, hoje);
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  if (dias > 1) return `faltam ${dias} dias`;
  if (dias === -1) return "venceu ontem";
  return `venceu há ${-dias} dias`;
}

/**
 * Só os dígitos de um texto.
 * @param {string} texto
 * @returns {string}
 */
export function soDigitos(texto) {
  return String(texto ?? "").replace(/\D/g, "");
}

/**
 * Calcula os dois dígitos verificadores de CPF ou CNPJ (módulo 11).
 * @param {string} base dígitos sem os verificadores
 * @param {number[]} pesos
 * @returns {number}
 */
function digitoVerificador(base, pesos) {
  const soma = [...base].reduce((total, d, i) => total + Number(d) * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/**
 * Valida CNPJ pelos dígitos verificadores (Instrução Normativa RFB nº 2.119/2022).
 * @param {string} texto
 * @returns {boolean}
 */
export function cnpjValido(texto) {
  const d = soDigitos(texto);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const p2 = [6, ...p1];
  const d1 = digitoVerificador(d.slice(0, 12), p1);
  const d2 = digitoVerificador(d.slice(0, 12) + d1, p2);
  return d.endsWith(`${d1}${d2}`);
}

/**
 * Valida CPF pelos dígitos verificadores.
 * @param {string} texto
 * @returns {boolean}
 */
export function cpfValido(texto) {
  const d = soDigitos(texto);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const d1 = digitoVerificador(d.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador(d.slice(0, 9) + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d.endsWith(`${d1}${d2}`);
}

/**
 * CNPJ ou CPF com pontuação: 11222333000181 → "11.222.333/0001-81".
 * @param {string} texto
 * @returns {string}
 */
export function documentoBR(texto) {
  const d = soDigitos(texto);
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return texto;
}

/**
 * Nome de arquivo seguro para o Storage: sem acento, espaço ou barra.
 * @param {string} nome
 * @returns {string}
 */
export function nomeDeArquivoSeguro(nome) {
  const semAcento = nome.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const limpo = semAcento
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (limpo || "arquivo").slice(-120);
}

/**
 * Iniciais para o avatar: "Mercado Bom Preço" → "MB".
 * @param {string} nome
 * @returns {string}
 */
export function iniciais(nome) {
  const palavras = String(nome ?? "")
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p));
  return (
    palavras
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?"
  );
}
