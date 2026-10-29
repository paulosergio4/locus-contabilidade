/**
 * Equipe · Entrada: documentos que os clientes enviaram, com filtro por status.
 * A equipe abre o arquivo e marca como em análise, conferido ou recusado.
 */
import { linkTemporario } from "../../../compartilhado/js/arquivos.js";
import { competenciaBR, dataHoraBR } from "../../../compartilhado/js/formatos.js";
import { html } from "../../../compartilhado/js/html.js";
import { ic } from "../../../compartilhado/js/icones.js";
import { db, mensagemDeErro } from "../../../compartilhado/js/supabase.js";
import { avisar } from "../../../compartilhado/js/ui.js";
import { recarregarTela, titulo, vazio } from "../componentes.js";
import { nomeDaEmpresaPorId } from "../estado.js";
import { CATEGORIA_DOCUMENTO, STATUS_DOCUMENTO } from "../rotulos.js";
import { atualizarSelos } from "../selos.js";

/** @typedef {import("../../../tipos").Documento} Documento */

let filtro = "recebido";

/** @param {import("../navegacao.js").Contexto} _ctx */
export async function montar(_ctx) {
  let consulta = db()
    .from("documentos")
    .select("id, empresa_id, categoria, competencia, descricao, caminho, nome_arquivo, status, criado_em")
    .order("criado_em", { ascending: false })
    .limit(150);
  if (filtro !== "todos") consulta = consulta.eq("status", filtro);
  const { data, error } = await consulta;
  if (error) throw error;
  /** @type {Documento[]} */
  const documentos = /** @type {any} */ (data) ?? [];

  const filtros = [
    ["recebido", "Novos"],
    ["em_analise", "Em análise"],
    ["todos", "Todos"],
  ];

  return {
    conteudo: html`${titulo("Entrada", "Documentos que os clientes enviaram pelo app.")}
      <div class="seg" role="group" aria-label="Filtrar documentos">
        ${filtros.map(([k, t]) => html`<button type="button" data-filtro="${k}" aria-pressed="${filtro === k}">${t}</button>`)}
      </div>
      <div class="stack">
        ${
          documentos.length
            ? documentos.map(
                (d) =>
                  html`<div class="item doc-i">
                    <span class="ic">${ic("file")}</span>
                    <span class="tx">
                      <b>${d.nome_arquivo}</b>
                      <span
                        >${nomeDaEmpresaPorId(d.empresa_id)} ·
                        ${CATEGORIA_DOCUMENTO[d.categoria]}${d.competencia ? ` · ${competenciaBR(d.competencia)}` : ""}
                        · ${dataHoraBR(d.criado_em)}</span
                      >
                      ${d.descricao ? html`<span>${d.descricao}</span>` : ""}
                    </span>
                    <span class="doc-acts">
                      <button
                        type="button"
                        class="mini-b"
                        data-abrir="${d.caminho}"
                        data-nome="${d.nome_arquivo}"
                      >
                        Baixar
                      </button>
                      <label class="sr-only" for="st-${d.id}">Status</label>
                      <select id="st-${d.id}" class="mini-b" data-status="${d.id}">
                        ${Object.entries(STATUS_DOCUMENTO).map(
                          ([k, [t]]) =>
                            html`<option value="${k}" ${k === d.status ? "selected" : ""}>${t}</option>`,
                        )}
                      </select>
                    </span>
                  </div>`,
              )
            : vazio(filtro === "recebido" ? "Nenhum documento novo. Tudo conferido." : "Nada por aqui.")
        }
      </div>`,
    /** @param {HTMLElement} raiz @param {AbortSignal} sinal */
    aoMontar(raiz, sinal) {
      raiz.addEventListener(
        "click",
        async (e) => {
          const alvo = e.target instanceof Element ? e.target : null;
          const botaoFiltro = alvo?.closest("[data-filtro]");
          if (botaoFiltro instanceof HTMLElement) {
            filtro = botaoFiltro.dataset.filtro ?? "recebido";
            recarregarTela();
            return;
          }
          const abrir = alvo?.closest("[data-abrir]");
          if (abrir instanceof HTMLElement) {
            try {
              location.href = await linkTemporario(abrir.dataset.abrir ?? "", abrir.dataset.nome);
            } catch (x) {
              avisar(mensagemDeErro(x), "erro");
            }
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
            .from("documentos")
            .update({ status: seletor.value })
            .eq("id", seletor.dataset.status);
          if (erro) return avisar(mensagemDeErro(erro), "erro");
          avisar("Status atualizado.");
          atualizarSelos().catch(() => {});
        },
        { signal: sinal },
      );
    },
  };
}
