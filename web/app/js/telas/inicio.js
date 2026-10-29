/**
 * Início do cliente: próximo vencimento, resumo do mês e avisos da Lócus.
 */
import { dataHoraBR, iniciais, prazoTexto, reais } from "../../../compartilhado/js/formatos.js";
import { html } from "../../../compartilhado/js/html.js";
import { db } from "../../../compartilhado/js/supabase.js";
import { temaEscuroAgora, aplicarTema } from "../../../compartilhado/js/ui.js";
import { item, pill, vazio } from "../componentes.js";
import { empresaAtiva, escolherEmpresa, estado, nomeDaEmpresa } from "../estado.js";
import { atualizarSelos } from "../selos.js";

/** @typedef {import("../../../tipos").Guia} Guia */
/** @typedef {import("../../../tipos").Aviso} Aviso */

function saudacao() {
  const hora = Number(
    new Date().toLocaleString("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }),
  );
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

/** @param {import("../navegacao.js").Contexto} _ctx */
export async function montar(_ctx) {
  const empresa = empresaAtiva();
  const primeiroNome = (estado.perfil?.nome || "").split(" ")[0];
  const topo = html`<div class="hdr">
    <div class="who">
      <small>${saudacao()}${primeiroNome ? `, ${primeiroNome}` : ""}</small>
      <b>${nomeDaEmpresa(empresa) || "Lócus"}</b>
    </div>
    <span class="acts">
      <button type="button" class="tbtn" data-acao="tema" aria-label="Mudar entre fundo claro e escuro">
        <svg
          class="lua"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
        </svg>
        <svg
          class="sol"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          />
        </svg>
      </button>
      <button type="button" class="av" data-ir="perfil" aria-label="Perfil e empresa">
        ${iniciais(nomeDaEmpresa(empresa))}
      </button>
    </span>
  </div>`;

  if (!empresa) {
    return {
      conteudo: html`${topo}${vazio("A Lócus ainda está ligando a sua empresa ao app. Em breve tudo aparece aqui.")}`,
    };
  }

  const [guias, avisos, lidos, chamados] = await Promise.all([
    db()
      .from("guias")
      .select("id, tipo, competencia, valor_centavos, vencimento, status")
      .eq("empresa_id", empresa.id)
      .eq("status", "a_pagar")
      .order("vencimento"),
    db()
      .from("avisos")
      .select("id, titulo, corpo, destino, criado_em")
      .eq("empresa_id", empresa.id)
      .order("criado_em", { ascending: false })
      .limit(8),
    db().from("avisos_lidos").select("aviso_id"),
    db()
      .from("chamados")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", empresa.id)
      .neq("status", "resolvido"),
  ]);
  for (const r of [guias, avisos, lidos]) if (r.error) throw r.error;

  /** @type {Guia[]} */
  const aPagar = /** @type {any} */ (guias.data) ?? [];
  /** @type {Aviso[]} */
  const listaAvisos = /** @type {any} */ (avisos.data) ?? [];
  const jaLidos = new Set((lidos.data ?? []).map((l) => l.aviso_id));
  const proxima = aPagar[0];
  const total = aPagar.reduce((soma, g) => soma + g.valor_centavos, 0);
  const trocaEmpresa =
    estado.empresas.length > 1
      ? html`<div class="field">
          <label for="troca-empresa">Empresa</label>
          <select id="troca-empresa">
            ${estado.empresas.map(
              (e) =>
                html`<option value="${e.id}" ${e.id === empresa.id ? "selected" : ""}>
                  ${nomeDaEmpresa(e)}
                </option>`,
            )}
          </select>
        </div>`
      : "";

  const conteudo = html`${topo}${trocaEmpresa}
    <div class="grid2">
      <div class="kpi"><small>Guias a pagar</small><b>${aPagar.length}</b><em>${reais(total)}</em></div>
      <div class="kpi">
        <small>Pedidos em andamento</small><b>${chamados.count ?? 0}</b><em>com a Lócus</em>
      </div>
    </div>

    <div class="sec">Próximo vencimento</div>
    ${
      proxima
        ? item({
            icone: "guia",
            titulo: proxima.tipo,
            detalhe: prazoTexto(proxima.vencimento),
            direita: reais(proxima.valor_centavos),
            ir: `guias/${proxima.id}`,
          })
        : vazio("Nenhuma guia para pagar agora.")
    }

    <div class="sec">Atalhos</div>
    <div class="grid2">
      ${item({ icone: "up", titulo: "Enviar documento", ir: "enviar" })}
      ${item({ icone: "chat", titulo: "Abrir pedido", ir: "chamados" })}
      ${item({ icone: "chart", titulo: "Ver painel", ir: "painel" })}
      ${item({ icone: "file", titulo: "Arquivo da empresa", ir: "arquivo" })}
    </div>

    <div class="sec">Avisos da Lócus</div>
    <div class="stack">
      ${
        listaAvisos.length
          ? listaAvisos.map((a) =>
              item({
                icone: "bell",
                titulo: a.titulo,
                detalhe: `${a.corpo ? `${a.corpo} · ` : ""}${dataHoraBR(a.criado_em)}`,
                direita: jaLidos.has(a.id) ? "" : pill(["Novo", "new"]),
                classe: jaLidos.has(a.id) ? "lido" : "",
                atributos: { "data-aviso": a.id, "data-destino": a.destino ?? "" },
              }),
            )
          : vazio("Os avisos da Lócus aparecem aqui.")
      }
    </div>`;

  return {
    conteudo,
    /** @param {HTMLElement} raiz @param {AbortSignal} sinal */
    aoMontar(raiz, sinal) {
      raiz.addEventListener(
        "click",
        async (e) => {
          const alvo = e.target instanceof Element ? e.target : null;
          if (alvo?.closest('[data-acao="tema"]')) {
            aplicarTema(temaEscuroAgora() ? "light" : "dark");
            return;
          }
          const aviso = alvo?.closest("[data-aviso]");
          if (aviso instanceof HTMLElement) {
            await db()
              .from("avisos_lidos")
              .upsert({ aviso_id: aviso.dataset.aviso }, { ignoreDuplicates: true });
            atualizarSelos().catch(() => {});
            location.hash = `#/${aviso.dataset.destino || "inicio"}`;
          }
        },
        { signal: sinal },
      );
      raiz.querySelector("#troca-empresa")?.addEventListener(
        "change",
        (e) => {
          escolherEmpresa(/** @type {HTMLSelectElement} */ (e.target).value);
          atualizarSelos().catch(() => {});
          location.reload();
        },
        { signal: sinal },
      );
    },
  };
}
