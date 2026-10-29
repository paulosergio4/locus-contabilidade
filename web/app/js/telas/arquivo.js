/**
 * Arquivo da empresa: tudo o que a Lócus entregou (balancetes, holerites, contratos,
 * certidões), separado por tipo. Cada download usa um link temporário.
 */
import { linkTemporario } from "../../../compartilhado/js/arquivos.js";
import { competenciaBR, dataBR } from "../../../compartilhado/js/formatos.js";
import { html } from "../../../compartilhado/js/html.js";
import { db, mensagemDeErro } from "../../../compartilhado/js/supabase.js";
import { avisar } from "../../../compartilhado/js/ui.js";
import { item, titulo, vazio } from "../componentes.js";
import { empresaAtiva } from "../estado.js";
import { CATEGORIA_ENTREGA } from "../rotulos.js";

/** @typedef {import("../../../tipos").Entrega} Entrega */

/** @param {import("../navegacao.js").Contexto} _ctx */
export async function montar(_ctx) {
  const empresa = empresaAtiva();
  const voltar = { rota: "inicio", texto: "Início" };
  if (!empresa)
    return { conteudo: html`${titulo("Arquivo da empresa", "", voltar)}${vazio("Nenhuma empresa ligada.")}` };

  const { data, error } = await db()
    .from("entregas")
    .select("id, categoria, titulo, competencia, caminho, nome_arquivo, publicado_em")
    .eq("empresa_id", empresa.id)
    .order("publicado_em", { ascending: false })
    .limit(200);
  if (error) throw error;
  /** @type {Entrega[]} */
  const entregas = /** @type {any} */ (data) ?? [];

  /** @type {Record<string, Entrega[]>} */
  const porCategoria = {};
  for (const e of entregas) (porCategoria[e.categoria] ??= []).push(e);

  return {
    conteudo: html`${titulo("Arquivo da empresa", "Tudo o que a Lócus já entregou, guardado num lugar só.", voltar)}
    ${
      entregas.length
        ? Object.entries(porCategoria).map(
            ([categoria, lista]) =>
              html`<div class="sec">${CATEGORIA_ENTREGA[categoria]}</div>
                <div class="stack">
                  ${lista.map((e) =>
                    item({
                      icone: "file",
                      titulo: e.titulo,
                      detalhe: e.competencia
                        ? competenciaBR(e.competencia)
                        : `publicado em ${dataBR(e.publicado_em)}`,
                      atributos: { "data-caminho": e.caminho, "data-nome": e.nome_arquivo },
                    }),
                  )}
                </div>`,
          )
        : vazio("Os documentos que a Lócus entregar aparecem aqui.")
    }`,
    /** @param {HTMLElement} raiz @param {AbortSignal} sinal */
    aoMontar(raiz, sinal) {
      raiz.addEventListener(
        "click",
        async (e) => {
          const alvo = e.target instanceof Element ? e.target.closest("[data-caminho]") : null;
          if (!(alvo instanceof HTMLElement)) return;
          try {
            window.open(await linkTemporario(alvo.dataset.caminho ?? ""), "_blank", "noopener");
          } catch (x) {
            avisar(mensagemDeErro(x), "erro");
          }
        },
        { signal: sinal },
      );
    },
  };
}
