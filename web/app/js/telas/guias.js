/**
 * Guias do cliente: lista com filtro e detalhe com código de barras, PIX e PDF.
 * A equipe também abre o detalhe por aqui (pela tela do cliente).
 */
import { competenciaBR, dataBR, prazoTexto, reais } from "../../../compartilhado/js/formatos.js";
import { html } from "../../../compartilhado/js/html.js";
import { ic } from "../../../compartilhado/js/icones.js";
import { linkTemporario } from "../../../compartilhado/js/arquivos.js";
import { db, mensagemDeErro } from "../../../compartilhado/js/supabase.js";
import { avisar, comCarregando } from "../../../compartilhado/js/ui.js";
import { copiar, item, linha, pill, recarregarTela, titulo, vazio } from "../componentes.js";
import { ehEquipe, empresaAtiva, nomeDaEmpresaPorId } from "../estado.js";
import { STATUS_GUIA } from "../rotulos.js";

/** @typedef {import("../../../tipos").Guia} Guia */

const FILTROS = [
  ["a_pagar", "A pagar"],
  ["paga", "Pagas"],
  ["todas", "Todas"],
];
let filtro = "a_pagar";

/** @param {import("../navegacao.js").Contexto} ctx */
export async function montar(ctx) {
  return ctx.parametro ? detalhe(ctx.parametro) : lista();
}

async function lista() {
  const empresa = empresaAtiva();
  if (!empresa)
    return { conteudo: html`${titulo("Guias")}${vazio("Nenhuma empresa ligada ao seu acesso.")}` };

  let consulta = db()
    .from("guias")
    .select("id, tipo, competencia, valor_centavos, vencimento, status")
    .eq("empresa_id", empresa.id)
    .order("vencimento", { ascending: filtro === "a_pagar" })
    .limit(100);
  if (filtro !== "todas") consulta = consulta.eq("status", filtro);
  const { data, error } = await consulta;
  if (error) throw error;
  /** @type {Guia[]} */
  const guias = /** @type {any} */ (data) ?? [];

  return {
    conteudo: html`${titulo("Guias", "Toque numa guia para ver o código de barras, o PIX e o PDF.")}
      <div class="seg" role="group" aria-label="Filtrar guias">
        ${FILTROS.map(
          ([valor, texto]) =>
            html`<button type="button" data-filtro="${valor}" aria-pressed="${filtro === valor}">
              ${texto}
            </button>`,
        )}
      </div>
      <div class="stack">
        ${
          guias.length
            ? guias.map((g) =>
                item({
                  icone: "guia",
                  titulo: g.tipo,
                  detalhe: `${competenciaBR(g.competencia)} · vence ${dataBR(g.vencimento)}`,
                  direita: html`${reais(g.valor_centavos)}<br />${pill(STATUS_GUIA[g.status])}`,
                  ir: `guias/${g.id}`,
                }),
              )
            : vazio(filtro === "a_pagar" ? "Nenhuma guia para pagar. Tudo em dia." : "Nenhuma guia por aqui.")
        }
      </div>`,
    /** @param {HTMLElement} raiz @param {AbortSignal} sinal */
    aoMontar(raiz, sinal) {
      raiz.addEventListener(
        "click",
        (e) => {
          const botao = e.target instanceof Element ? e.target.closest("[data-filtro]") : null;
          if (botao instanceof HTMLElement && botao.dataset.filtro) {
            filtro = botao.dataset.filtro;
            recarregarTela();
          }
        },
        { signal: sinal },
      );
    },
  };
}

/** @param {string} id */
async function detalhe(id) {
  const { data, error } = await db().from("guias").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  /** @type {Guia | null} */
  const g = data;
  if (!g) return { conteudo: html`${titulo("Guia não encontrada", "", voltarPara())}` };

  const conteudo = html`${titulo(g.tipo, `${competenciaBR(g.competencia)} · ${prazoTexto(g.vencimento)}`, voltarPara(g))}
    <div class="kpi">
      <small>Valor</small><b>${reais(g.valor_centavos)}</b><em>${pill(STATUS_GUIA[g.status])}</em>
    </div>
    <div class="card stack">
      ${ehEquipe() ? linha("Empresa", nomeDaEmpresaPorId(g.empresa_id)) : ""}
      ${linha("Vencimento", dataBR(g.vencimento))} ${linha("Competência", competenciaBR(g.competencia))}
      ${g.descricao ? linha("Observação", g.descricao) : ""}
      ${g.pago_em ? linha("Marcada como paga em", dataBR(g.pago_em)) : ""}
    </div>
    ${
      g.linha_digitavel
        ? html`<div class="sec">Código de barras</div>
            <div class="code">${g.linha_digitavel}</div>
            <button type="button" class="btn" data-copiar="${g.linha_digitavel}">
              ${ic("copy")}Copiar código
            </button>`
        : ""
    }
    ${
      g.pix_copia_cola
        ? html`<div class="sec">PIX copia e cola</div>
            <button type="button" class="btn ghost" data-copiar="${g.pix_copia_cola}">
              ${ic("copy")}Copiar PIX
            </button>`
        : ""
    }
    ${
      g.caminho
        ? html`<div class="sec">Arquivo</div>
            <button type="button" class="btn ghost" data-abrir="${g.caminho}">
              ${ic("baixar")}Abrir o PDF da guia
            </button>`
        : ""
    }
    <div class="sec">Pagamento</div>
    ${
      g.status === "cancelada"
        ? vazio("Esta guia foi cancelada pela Lócus.")
        : g.status === "paga"
          ? html`<button type="button" class="btn ghost" data-paga="false">
              Desfazer: ainda não paguei
            </button>`
          : html`<button type="button" class="btn" data-paga="true">
              ${ic("check")}Já paguei esta guia
            </button>`
    }`;

  return {
    conteudo,
    /** @param {HTMLElement} raiz @param {AbortSignal} sinal */
    aoMontar(raiz, sinal) {
      raiz.addEventListener(
        "click",
        async (e) => {
          const alvo = e.target instanceof Element ? e.target : null;
          const botaoCopiar = alvo?.closest("[data-copiar]");
          if (botaoCopiar instanceof HTMLElement) {
            const ok = await copiar(botaoCopiar.dataset.copiar ?? "");
            avisar(
              ok ? "Copiado. Cole no app do seu banco." : "Não consegui copiar. Segure o texto para copiar.",
            );
            return;
          }
          const botaoAbrir = alvo?.closest("[data-abrir]");
          if (botaoAbrir instanceof HTMLButtonElement) {
            try {
              const url = await comCarregando(botaoAbrir, () =>
                linkTemporario(botaoAbrir.dataset.abrir ?? ""),
              );
              window.open(url, "_blank", "noopener");
            } catch (x) {
              avisar(mensagemDeErro(x), "erro");
            }
            return;
          }
          const botaoPaga = alvo?.closest("[data-paga]");
          if (botaoPaga instanceof HTMLButtonElement) {
            const paga = botaoPaga.dataset.paga === "true";
            try {
              await comCarregando(botaoPaga, async () => {
                const { error: erro } = await db().rpc("marcar_guia_paga", { p_guia: g.id, p_paga: paga });
                if (erro) throw erro;
              });
              avisar(paga ? "Pronto, guia marcada como paga." : "Guia voltou para a pagar.");
              recarregarTela();
            } catch (x) {
              avisar(mensagemDeErro(x), "erro");
            }
          }
        },
        { signal: sinal },
      );
    },
  };
}

/** @param {Guia} [g] */
function voltarPara(g) {
  if (ehEquipe() && g) return { rota: `clientes/${g.empresa_id}`, texto: "Cliente" };
  return { rota: "guias", texto: "Guias" };
}
