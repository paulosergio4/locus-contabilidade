/**
 * Navegação do app por endereço (#/guias, #/chamados/<id>...).
 * Usar o endereço deixa o botão "voltar" do celular funcionar e permite que um aviso
 * abra direto a tela certa.
 *
 * Cada tela é um módulo em js/telas/ que exporta `montar(contexto)` e devolve
 * { conteudo, aoMontar? }. A navegação pinta o conteúdo e chama aoMontar para ligar
 * os botões; ao trocar de tela, os ouvintes antigos são desligados pelo AbortSignal.
 */
import { html, pintar } from "../../compartilhado/js/html.js";
import { ic } from "../../compartilhado/js/icones.js";
import { avisar } from "../../compartilhado/js/ui.js";
import { mensagemDeErro } from "../../compartilhado/js/supabase.js";
import { attrs, carregando } from "./componentes.js";
import { ehEquipe } from "./estado.js";
import { selos } from "./selos.js";

import * as inicio from "./telas/inicio.js";
import * as guias from "./telas/guias.js";
import * as enviar from "./telas/enviar.js";
import * as painel from "./telas/painel.js";
import * as chamados from "./telas/chamados.js";
import * as arquivo from "./telas/arquivo.js";
import * as perfil from "./telas/perfil.js";
import * as clientes from "./telas/equipe-clientes.js";
import * as entrada from "./telas/equipe-entrada.js";
import * as publicar from "./telas/equipe-publicar.js";
import * as prazos from "./telas/equipe-prazos.js";
import * as contatos from "./telas/equipe-contatos.js";

/**
 * @typedef {{ parametro: string | null, sinal: AbortSignal }} Contexto
 * @typedef {{ conteudo: import("../../compartilhado/js/html.js").HtmlSeguro,
 *   aoMontar?: (raiz: HTMLElement, sinal: AbortSignal) => void }} Tela
 * @typedef {{ montar: (ctx: Contexto) => Promise<Tela> }} ModuloTela
 */

/** @type {Record<string, ModuloTela>} */
const TELAS = {
  inicio,
  guias,
  enviar,
  painel,
  chamados,
  arquivo,
  perfil,
  clientes,
  entrada,
  publicar,
  prazos,
  contatos,
};

/** Abas de cada papel: [rota, texto, ícone]. */
const ABAS = {
  cliente: [
    ["inicio", "Início", "home"],
    ["guias", "Guias", "guia"],
    ["enviar", "Enviar", "up"],
    ["painel", "Painel", "chart"],
    ["chamados", "Falar", "chat"],
  ],
  equipe: [
    ["clientes", "Clientes", "users"],
    ["entrada", "Entrada", "inbox"],
    ["publicar", "Publicar", "up"],
    ["chamados", "Chamados", "chat"],
    ["prazos", "Prazos", "cal"],
    ["contatos", "Site", "site"],
  ],
};

/** Telas que cada papel pode abrir (as abas mais as telas internas). */
const PERMITIDAS = {
  cliente: ["inicio", "guias", "enviar", "painel", "chamados", "arquivo", "perfil"],
  equipe: ["clientes", "entrada", "publicar", "chamados", "prazos", "contatos", "perfil", "guias"],
};

let controle = new AbortController();

const view = () => /** @type {HTMLElement} */ (document.getElementById("view"));

/** Lê o endereço atual: "#/chamados/abc" → { tela: "chamados", parametro: "abc" }. */
function rotaAtual() {
  const [tela = "", ...resto] = location.hash.replace(/^#\/?/, "").split("/");
  return {
    tela: decodeURIComponent(tela),
    parametro: resto.length ? decodeURIComponent(resto.join("/")) : null,
  };
}

function inicial() {
  return ehEquipe() ? "clientes" : "inicio";
}

/**
 * Vai para outra tela.
 * @param {string} caminho por exemplo "guias" ou "chamados/<id>"
 */
export function ir(caminho) {
  const destino = `#/${caminho}`;
  if (location.hash === destino) renderizar();
  else location.hash = destino;
}

/** Monta a tela de novo com dados atualizados. */
export function recarregar() {
  renderizar();
}

/** @param {string} telaAtiva */
function pintarAbas(telaAtiva) {
  const abas = ehEquipe() ? ABAS.equipe : ABAS.cliente;
  const menu = /** @type {HTMLElement} */ (document.getElementById("tabs"));
  menu.style.setProperty("--n-abas", String(abas.length));
  pintar(
    menu,
    html`<div class="marca-menu" aria-hidden="true">
        <svg viewBox="0 0 448 120"><use href="#logo-lockup" /></svg>
      </div>
      ${abas.map(
        ([rota, texto, icone]) =>
          html`<button
            type="button"
            data-ir="${rota}"
            ${attrs({ "aria-current": rota === telaAtiva ? "page" : null })}
          >
            ${ic(icone)}${texto}${selos[rota] ? html`<span class="badge">${selos[rota]}</span>` : ""}
          </button>`,
      )}`,
  );
}

async function renderizar() {
  let { tela, parametro } = rotaAtual();
  const papel = ehEquipe() ? "equipe" : "cliente";
  if (!PERMITIDAS[papel].includes(tela)) {
    tela = inicial();
    parametro = null;
    history.replaceState(null, "", `#/${tela}`);
  }

  controle.abort();
  controle = new AbortController();
  const sinal = controle.signal;
  pintarAbas(tela);
  pintar(view(), carregando());

  try {
    const resultado = await TELAS[tela].montar({ parametro, sinal });
    if (sinal.aborted) return;
    pintar(view(), resultado.conteudo);
    resultado.aoMontar?.(view(), sinal);
    view().classList.remove("anim");
    void view().offsetWidth;
    view().classList.add("anim");
    window.scrollTo({ top: 0 });
  } catch (erro) {
    if (sinal.aborted) return;
    console.error(erro);
    pintar(
      view(),
      html`<h2 class="t">Não deu para abrir</h2>
        <p class="s">${mensagemDeErro(erro)}</p>
        <button type="button" class="btn" data-ir="${tela}">Tentar de novo</button>`,
    );
  }
}

/** Liga a navegação. Chamar uma vez, depois do login. */
export function iniciarNavegacao() {
  window.addEventListener("hashchange", renderizar);
  document.addEventListener("recarregar-tela", () => renderizar());
  document.addEventListener("selos-mudaram", () => pintarAbas(rotaAtual().tela || inicial()));
  // Qualquer elemento com data-ir="rota" leva para a rota.
  document.addEventListener("click", (e) => {
    const alvo = e.target instanceof Element ? e.target.closest("[data-ir]") : null;
    if (alvo instanceof HTMLElement && alvo.dataset.ir) {
      e.preventDefault();
      ir(alvo.dataset.ir);
    }
  });
  window.addEventListener("unhandledrejection", (e) => avisar(mensagemDeErro(e.reason), "erro"));
  renderizar();
}
