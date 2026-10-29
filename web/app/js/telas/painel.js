/**
 * Painel do cliente: lista os diagnósticos publicados pela Lócus e abre o painel
 * de diagnóstico (web/painel) já com a planilha do mês carregada.
 */
import { competenciaBR, dataBR } from "../../../compartilhado/js/formatos.js";
import { html } from "../../../compartilhado/js/html.js";
import { ic } from "../../../compartilhado/js/icones.js";
import { db } from "../../../compartilhado/js/supabase.js";
import { item, titulo, vazio } from "../componentes.js";
import { empresaAtiva } from "../estado.js";

/** @typedef {import("../../../tipos").Entrega} Entrega */

/** @param {import("../navegacao.js").Contexto} _ctx */
export async function montar(_ctx) {
  const empresa = empresaAtiva();
  if (!empresa)
    return { conteudo: html`${titulo("Painel")}${vazio("Nenhuma empresa ligada ao seu acesso.")}` };

  const { data, error } = await db()
    .from("entregas")
    .select("id, titulo, competencia, publicado_em")
    .eq("empresa_id", empresa.id)
    .eq("categoria", "diagnostico")
    .order("publicado_em", { ascending: false })
    .limit(24);
  if (error) throw error;
  /** @type {Entrega[]} */
  const paineis = /** @type {any} */ (data) ?? [];
  const ultimo = paineis[0];

  return {
    conteudo: html`${titulo("Painel", "Faturamento, despesas, margem e impostos da sua empresa, mês a mês.")}
    ${
      ultimo
        ? html`<div class="card stack">
              <b>${ultimo.titulo}</b>
              <span class="s"
                >${ultimo.competencia ? competenciaBR(ultimo.competencia) : ""} · publicado em
                ${dataBR(ultimo.publicado_em)}</span
              >
              <a class="btn" href="../painel/?entrega=${ultimo.id}">${ic("chart")}Abrir o painel</a>
            </div>
            ${
              paineis.length > 1
                ? html`<div class="sec">Meses anteriores</div>
                    <div class="stack">
                      ${paineis.slice(1).map((p) =>
                        item({
                          icone: "chart",
                          titulo: p.titulo,
                          detalhe: p.competencia ? competenciaBR(p.competencia) : dataBR(p.publicado_em),
                          atributos: { "data-painel": p.id },
                        }),
                      )}
                    </div>`
                : ""
            }`
        : vazio("O painel aparece aqui quando a Lócus publicar o primeiro diagnóstico da sua empresa.")
    }`,
    /** @param {HTMLElement} raiz @param {AbortSignal} sinal */
    aoMontar(raiz, sinal) {
      raiz.addEventListener(
        "click",
        (e) => {
          const alvo = e.target instanceof Element ? e.target.closest("[data-painel]") : null;
          if (alvo instanceof HTMLElement) location.href = `../painel/?entrega=${alvo.dataset.painel}`;
        },
        { signal: sinal },
      );
    },
  };
}
