/**
 * Pedaços de tela reaproveitados: itens de lista, etiquetas, campos de formulário.
 * Todos devolvem HTML seguro (ver compartilhado/js/html.js).
 */
import { cru, escapar, html } from "../../compartilhado/js/html.js";
import { ic } from "../../compartilhado/js/icones.js";

/** @typedef {import("../../compartilhado/js/html.js").HtmlSeguro} HtmlSeguro */
/** @typedef {import("./rotulos.js").TomPill} TomPill */

/**
 * Atributos HTML a partir de um objeto: { "data-ir": "guias/1" } → data-ir="guias/1".
 * @param {Record<string, string | number | boolean | null | undefined>} [atributos]
 * @returns {HtmlSeguro}
 */
export function attrs(atributos = {}) {
  return cru(
    Object.entries(atributos)
      .filter(([, v]) => v !== null && v !== undefined && v !== false)
      .map(([k, v]) => (v === true ? ` ${escapar(k)}` : ` ${escapar(k)}="${escapar(v)}"`))
      .join(""),
  );
}

/**
 * Etiqueta colorida de status.
 * @param {[string, TomPill] | undefined} rotulo
 */
export function pill(rotulo) {
  if (!rotulo) return html``;
  return html`<span class="pill p-${rotulo[1]}">${rotulo[0]}</span>`;
}

/**
 * Item de lista. Se tiver `ir` ou `acao`, vira botão.
 * @param {{ icone?: string, titulo: unknown, detalhe?: unknown, direita?: unknown,
 *   ir?: string, atributos?: Record<string, string | number | boolean | null | undefined>, classe?: string }} opcoes
 */
export function item({ icone = "file", titulo, detalhe, direita, ir, atributos = {}, classe = "" }) {
  const miolo = html`<span class="ic">${ic(icone)}</span>
    <span class="tx"><b>${titulo}</b>${detalhe ? html`<span>${detalhe}</span>` : ""}</span>
    ${direita ? html`<span class="vl">${direita}</span>` : ""}`;
  if (ir || Object.keys(atributos).length) {
    return html`<button type="button" class="item ${classe}" ${attrs({ "data-ir": ir, ...atributos })}>
      ${miolo}
    </button>`;
  }
  return html`<div class="item ${classe}">${miolo}</div>`;
}

/** @param {string} texto */
export function vazio(texto) {
  return html`<div class="vazio">${texto}</div>`;
}

export function carregando() {
  return html`<div class="carregando" role="status"><i></i><span class="sr-only">Carregando…</span></div>`;
}

/**
 * Título da tela, com botão de voltar opcional.
 * @param {string} titulo
 * @param {unknown} [subtitulo]
 * @param {{ rota: string, texto: string }} [voltar]
 */
export function titulo(titulo, subtitulo, voltar) {
  return html`${
    voltar
      ? html`<button type="button" class="back" data-ir="${voltar.rota}">
            ${ic("back")}${voltar.texto}
          </button>`
      : ""
  }
    <h2 class="t">${titulo}</h2>
    ${subtitulo ? html`<p class="s">${subtitulo}</p>` : ""}`;
}

/**
 * Linha "rótulo · valor" usada nos detalhes.
 * @param {string} rotulo
 * @param {unknown} valor
 */
export function linha(rotulo, valor) {
  return html`<div class="linha-dado"><span>${rotulo}</span><b>${valor || "—"}</b></div>`;
}

/**
 * @typedef {{ nome: string, rotulo: string, tipo?: string, obrigatorio?: boolean, valor?: string | null,
 *   dica?: string, modo?: string, opcoes?: Array<[string, string]>, linhas?: number, aceitar?: string,
 *   captura?: boolean, max?: number }} Campo
 */

/**
 * Campo de formulário (texto, data, mês, número, seleção, área de texto ou arquivo).
 * @param {Campo} c
 */
export function campo(c) {
  const id = `c-${c.nome}`;
  const rotulo = html`<label for="${id}"
    >${c.rotulo}${c.obrigatorio ? "" : html` <span class="opc">opcional</span>`}</label
  >`;
  const comum = attrs({
    id,
    name: c.nome,
    required: c.obrigatorio,
    "aria-required": c.obrigatorio ? "true" : null,
    placeholder: c.dica,
    inputmode: c.modo,
    maxlength: c.max,
  });
  if (c.tipo === "select") {
    return html`<div class="field">
      ${rotulo}<select${comum}>
        ${(c.opcoes ?? []).map(
          ([valor, texto]) =>
            html`<option value="${valor}" ${attrs({ selected: valor === c.valor })}>${texto}</option>`,
        )}
      </select>
    </div>`;
  }
  if (c.tipo === "area") {
    return html`<div class="field">${rotulo}<textarea${comum} rows="${c.linhas ?? 3}">${c.valor ?? ""}</textarea></div>`;
  }
  if (c.tipo === "file") {
    return html`<div class="field">
      ${rotulo}<input
        type="file"
        ${comum}${attrs({ accept: c.aceitar, capture: c.captura ? "environment" : null })}
      />
    </div>`;
  }
  return html`<div class="field">
    ${rotulo}<input type="${c.tipo ?? "text"}" ${comum}${attrs({ value: c.valor ?? null })} />
  </div>`;
}

/**
 * Lê os campos de um formulário como objeto de textos (arquivos ficam de fora).
 * @param {HTMLFormElement} form
 * @returns {Record<string, string>}
 */
export function lerFormulario(form) {
  /** @type {Record<string, string>} */
  const dados = {};
  new FormData(form).forEach((valor, chave) => {
    if (typeof valor === "string") dados[chave] = valor.trim();
  });
  return dados;
}

/**
 * Confere os campos obrigatórios e mostra o primeiro que falta.
 * @param {HTMLFormElement} form
 * @returns {string | null} mensagem de erro, ou null se está tudo certo
 */
export function conferirObrigatorios(form) {
  /** @type {Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>} */
  const campos = Array.from(form.querySelectorAll("[required]"));
  campos.forEach((c) => c.classList.remove("erro"));
  const faltando = campos.filter((c) =>
    c instanceof HTMLInputElement && c.type === "file" ? !c.files?.length : !c.value.trim(),
  );
  if (!faltando.length) return null;
  faltando.forEach((c) => c.classList.add("erro"));
  faltando[0].focus();
  const rotulo = form.querySelector(`label[for="${faltando[0].id}"]`)?.firstChild?.textContent?.trim() ?? "";
  return faltando.length === 1
    ? `Falta preencher: ${rotulo}`
    : `Faltam ${faltando.length} campos. Comece por: ${rotulo}`;
}

/**
 * Copia texto para a área de transferência.
 * @param {string} texto
 * @returns {Promise<boolean>}
 */
export async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch (_) {
    return false;
  }
}

/** Pede para a navegação montar a tela atual de novo (com dados atualizados). */
export function recarregarTela() {
  document.dispatchEvent(new CustomEvent("recarregar-tela"));
}
