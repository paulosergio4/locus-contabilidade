/**
 * Equipe · Site: contatos e pedidos de diagnóstico que chegaram pelo site.
 * A equipe responde pelo WhatsApp e acompanha até virar cliente.
 */
import { dataHoraBR, soDigitos } from "../../../compartilhado/js/formatos.js";
import { html } from "../../../compartilhado/js/html.js";
import { ic } from "../../../compartilhado/js/icones.js";
import { db, mensagemDeErro } from "../../../compartilhado/js/supabase.js";
import { avisar } from "../../../compartilhado/js/ui.js";
import { pill, recarregarTela, titulo, vazio } from "../componentes.js";
import { STATUS_CONTATO } from "../rotulos.js";
import { atualizarSelos } from "../selos.js";

/** @typedef {import("../../../tipos").ContatoSite} ContatoSite */

let filtro = "abertos";

/** @param {import("../navegacao.js").Contexto} _ctx */
export async function montar(_ctx) {
  let consulta = db().from("contatos_site").select("*").order("criado_em", { ascending: false }).limit(200);
  if (filtro === "abertos") consulta = consulta.in("status", ["novo", "em_contato"]);
  const { data, error } = await consulta;
  if (error) throw error;
  /** @type {ContatoSite[]} */
  const contatos = /** @type {any} */ (data) ?? [];

  return {
    conteudo: html`${titulo("Contatos do site", "Quem pediu diagnóstico ou mandou mensagem pelo site.")}
      <div class="seg" role="group" aria-label="Filtrar contatos">
        <button type="button" data-filtro="abertos" aria-pressed="${filtro === "abertos"}">Em aberto</button>
        <button type="button" data-filtro="todos" aria-pressed="${filtro === "todos"}">Todos</button>
      </div>
      <div class="stack">
        ${
          contatos.length
            ? contatos.map((c) => {
                const telefone = soDigitos(c.telefone ?? "");
                const whats = telefone
                  ? `https://wa.me/55${telefone.replace(/^55/, "")}?text=${encodeURIComponent(`Olá, ${c.nome.split(" ")[0]}! Aqui é da Lócus Contabilidade, recebemos o seu contato pelo site.`)}`
                  : "";
                return html`<div class="card stack">
                  <div class="linha-dado"><b>${c.nome}</b>${pill(STATUS_CONTATO[c.status])}</div>
                  <span class="s"
                    >${c.interesse ?? ""}${c.empresa ? ` · ${c.empresa}` : ""} ·
                    ${dataHoraBR(c.criado_em)}</span
                  >
                  ${c.mensagem ? html`<p>${c.mensagem}</p>` : ""}
                  <span class="s">${c.telefone ?? ""} ${c.email ?? ""}</span>
                  <div class="grid2">
                    ${whats ? html`<a class="btn" href="${whats}" target="_blank" rel="noopener">${ic("chat")}WhatsApp</a>` : html`<a class="btn" href="mailto:${c.email ?? ""}">E-mail</a>`}
                    <select class="btn ghost" data-status="${c.id}" aria-label="Situação do contato">
                      ${Object.entries(STATUS_CONTATO).map(([k, [t]]) => html`<option value="${k}" ${k === c.status ? "selected" : ""}>${t}</option>`)}
                    </select>
                  </div>
                </div>`;
              })
            : vazio("Nenhum contato novo do site.")
        }
      </div>`,
    /** @param {HTMLElement} raiz @param {AbortSignal} sinal */
    aoMontar(raiz, sinal) {
      raiz.addEventListener(
        "click",
        (e) => {
          const botao = e.target instanceof Element ? e.target.closest("[data-filtro]") : null;
          if (botao instanceof HTMLElement) {
            filtro = botao.dataset.filtro ?? "abertos";
            recarregarTela();
          }
        },
        { signal: sinal },
      );
      raiz.addEventListener(
        "change",
        async (e) => {
          const seletor = e.target instanceof HTMLSelectElement && e.target.dataset.status ? e.target : null;
          if (!seletor) return;
          const { error: erro } = await db()
            .from("contatos_site")
            .update({ status: seletor.value })
            .eq("id", seletor.dataset.status);
          if (erro) return avisar(mensagemDeErro(erro), "erro");
          avisar("Situação atualizada.");
          atualizarSelos().catch(() => {});
        },
        { signal: sinal },
      );
    },
  };
}
