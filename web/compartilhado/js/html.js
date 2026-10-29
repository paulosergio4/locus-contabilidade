/**
 * Montagem segura de HTML.
 * Todo valor que vem do banco ou do usuário passa pelo `html`, que escapa < > & " '.
 * Assim um nome de arquivo como `<img onerror=...>` aparece como texto e não roda.
 * Para inserir HTML já seguro (ícones, outro trecho montado com `html`), use `cru()`.
 */

const SEGURO = Symbol("html-seguro");

/**
 * @typedef {{ [SEGURO]: true, valor: string, toString(): string }} HtmlSeguro
 */

/**
 * Marca um texto como HTML confiável.
 * @param {string} valor
 * @returns {HtmlSeguro}
 */
export function cru(valor) {
  return { [SEGURO]: true, valor, toString: () => valor };
}

/**
 * Escapa um texto para uso dentro de HTML.
 * @param {unknown} valor
 * @returns {string}
 */
export function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * @param {unknown} valor
 * @returns {string}
 */
function converter(valor) {
  if (valor === null || valor === undefined || valor === false) return "";
  if (Array.isArray(valor)) return valor.map(converter).join("");
  if (typeof valor === "object" && SEGURO in valor) return /** @type {HtmlSeguro} */ (valor).valor;
  return escapar(valor);
}

/**
 * Template seguro: html`<b>${nome}</b>`.
 * Listas são juntadas; null, undefined e false viram vazio.
 * @param {TemplateStringsArray} partes
 * @param {...unknown} valores
 * @returns {HtmlSeguro}
 */
export function html(partes, ...valores) {
  let saida = partes[0];
  valores.forEach((valor, i) => {
    saida += converter(valor) + partes[i + 1];
  });
  return cru(saida);
}

/**
 * Coloca o HTML seguro dentro de um elemento.
 * @param {Element} elemento
 * @param {HtmlSeguro} conteudo
 */
export function pintar(elemento, conteudo) {
  elemento.innerHTML = conteudo.valor;
}
