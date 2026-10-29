/**
 * Peças de interface usadas em todas as telas: aviso rápido (toast), folha de
 * detalhes (sheet), tema claro/escuro e estado de "carregando" dos botões.
 * Os elementos #toast, #sheet e #sheetBg ficam no index.html de cada página.
 */
import { html, pintar } from "./html.js";
import { ic } from "./icones.js";

/** @param {string} id */
const el = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

let temporizadorAviso = 0;

/**
 * Mostra um aviso curto no rodapé.
 * @param {string} texto
 * @param {"ok" | "erro"} [tipo]
 */
export function avisar(texto, tipo = "ok") {
  const caixa = el("toast");
  if (!caixa) return;
  el("toastTx").textContent = texto;
  caixa.dataset.tipo = tipo;
  caixa.classList.add("on");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = window.setTimeout(() => caixa.classList.remove("on"), tipo === "erro" ? 4500 : 2600);
}

/** @type {Element | null} */
let focoAntes = null;

/**
 * Abre a folha de detalhes com o conteúdo dado.
 * @param {import("./html.js").HtmlSeguro} conteudo
 */
export function abrirFolha(conteudo) {
  focoAntes = document.activeElement;
  pintar(
    el("sheetBody"),
    html`<button type="button" class="sh-x" data-fechar-folha aria-label="Fechar">${ic("x")}</button
      >${conteudo}`,
  );
  el("sheet").classList.add("on");
  el("sheetBg").classList.add("on");
  el("sheet").setAttribute("aria-hidden", "false");
  /** @type {HTMLElement | null} */
  const primeiro = el("sheet").querySelector("input, select, textarea, button:not(.sh-x)");
  (primeiro ?? el("sheet")).focus();
}

export function fecharFolha() {
  el("sheet").classList.remove("on");
  el("sheetBg").classList.remove("on");
  el("sheet").setAttribute("aria-hidden", "true");
  if (focoAntes instanceof HTMLElement) focoAntes.focus();
}

/** Liga o fechar da folha (fundo, botão X e tecla Esc). Chamar uma vez ao abrir a página. */
export function prepararFolha() {
  el("sheetBg").addEventListener("click", fecharFolha);
  document.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest("[data-fechar-folha]")) fecharFolha();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && el("sheet").classList.contains("on")) fecharFolha();
  });
}

/**
 * Deixa o botão em "carregando" enquanto a tarefa roda e devolve o resultado.
 * @template T
 * @param {HTMLButtonElement | null} botao
 * @param {() => Promise<T>} tarefa
 * @returns {Promise<T>}
 */
export async function comCarregando(botao, tarefa) {
  if (botao) {
    botao.disabled = true;
    botao.dataset.ocupado = "true";
  }
  try {
    return await tarefa();
  } finally {
    if (botao) {
      botao.disabled = false;
      delete botao.dataset.ocupado;
    }
  }
}

/* ------------------------------------------------------------------ tema */
const CHAVE_TEMA = "locus-tema";

/** @returns {"auto" | "light" | "dark"} */
export function temaSalvo() {
  try {
    const t = localStorage.getItem(CHAVE_TEMA);
    return t === "dark" || t === "auto" ? t : "light";
  } catch (_) {
    return "light";
  }
}

/** @returns {boolean} */
export function temaEscuroAgora() {
  const t = document.documentElement.dataset.theme;
  if (t === "auto") return matchMedia("(prefers-color-scheme: dark)").matches;
  return t === "dark";
}

/**
 * Aplica e guarda o tema escolhido.
 * @param {"auto" | "light" | "dark"} tema
 */
export function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema;
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch (_) {
    /* navegador sem armazenamento: o tema vale só nesta visita */
  }
  const cor = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", cor));
}
