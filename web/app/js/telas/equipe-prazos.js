/**
 * Equipe · Prazos: agenda interna de obrigações (DCTFWeb, EFD, DAS, folha...).
 * Só a equipe vê. Atrasados aparecem primeiro, em vermelho.
 */
import { dataBR, diasAte, prazoTexto } from "../../../compartilhado/js/formatos.js";
import { html } from "../../../compartilhado/js/html.js";
import { ic } from "../../../compartilhado/js/icones.js";
import { db, mensagemDeErro } from "../../../compartilhado/js/supabase.js";
import { abrirFolha, avisar, comCarregando, fecharFolha } from "../../../compartilhado/js/ui.js";
import {
  campo,
  conferirObrigatorios,
  lerFormulario,
  pill,
  recarregarTela,
  titulo,
  vazio,
} from "../componentes.js";
import { estado, nomeDaEmpresa, nomeDaEmpresaPorId, nomeDaEquipe } from "../estado.js";

/** @typedef {import("../../../tipos").Prazo} Prazo */

let mostrarConcluidos = false;

/** @param {Prazo} p */
function tom(p) {
  if (p.status === "concluido")
    return /** @type {[string, import("../rotulos.js").TomPill]} */ (["Feito", "ok"]);
  const dias = diasAte(p.vencimento);
  if (dias < 0) return /** @type {[string, import("../rotulos.js").TomPill]} */ (["Atrasado", "bad"]);
  if (dias <= 3) return /** @type {[string, import("../rotulos.js").TomPill]} */ (["Esta semana", "due"]);
  return /** @type {[string, import("../rotulos.js").TomPill]} */ ([dataBR(p.vencimento), "new"]);
}

/** @param {import("../navegacao.js").Contexto} _ctx */
export async function montar(_ctx) {
  let consulta = db()
    .from("prazos")
    .select("id, empresa_id, titulo, vencimento, status, responsavel_id, concluido_em")
    .order("vencimento")
    .limit(300);
  if (!mostrarConcluidos) consulta = consulta.eq("status", "pendente");
  const { data, error } = await consulta;
  if (error) throw error;
  /** @type {Prazo[]} */
  const prazos = /** @type {any} */ (data) ?? [];

  return {
    conteudo: html`${titulo("Prazos", "Obrigações de todos os clientes, em ordem de vencimento.")}
      <div class="seg" role="group" aria-label="Filtrar prazos">
        <button type="button" data-filtro="pendentes" aria-pressed="${!mostrarConcluidos}">Pendentes</button>
        <button type="button" data-filtro="todos" aria-pressed="${mostrarConcluidos}">Todos</button>
      </div>
      <button type="button" class="btn" id="novo-prazo">${ic("plus")}Novo prazo</button>
      <div class="sec"></div>
      <div class="stack">
        ${
          prazos.length
            ? prazos.map(
                (p) =>
                  html`<div class="item doc-i">
                    <span class="ic">${ic("cal")}</span>
                    <span class="tx">
                      <b>${p.titulo}</b>
                      <span
                        >${p.empresa_id ? nomeDaEmpresaPorId(p.empresa_id) : "Escritório"} ·
                        ${prazoTexto(p.vencimento)}${p.responsavel_id ? ` · ${nomeDaEquipe(p.responsavel_id)}` : ""}</span
                      >
                    </span>
                    <span class="doc-acts">
                      ${pill(tom(p))}
                      ${
                        p.status === "pendente"
                          ? html`<button type="button" class="mini-b pri" data-concluir="${p.id}">
                              Feito
                            </button>`
                          : html`<button type="button" class="mini-b" data-reabrir="${p.id}">Reabrir</button>`
                      }
                    </span>
                  </div>`,
              )
            : vazio("Nenhum prazo pendente. Cadastre os do mês para não depender da memória.")
        }
      </div>`,
    /** @param {HTMLElement} raiz @param {AbortSignal} sinal */
    aoMontar(raiz, sinal) {
      raiz.addEventListener(
        "click",
        async (e) => {
          const alvo = e.target instanceof Element ? e.target : null;
          const filtro = alvo?.closest("[data-filtro]");
          if (filtro instanceof HTMLElement) {
            mostrarConcluidos = filtro.dataset.filtro === "todos";
            return recarregarTela();
          }
          if (alvo?.closest("#novo-prazo")) return novoPrazo();
          const concluir = alvo?.closest("[data-concluir], [data-reabrir]");
          if (concluir instanceof HTMLElement) {
            const feito = Boolean(concluir.dataset.concluir);
            const { error: erro } = await db()
              .from("prazos")
              .update(
                feito
                  ? { status: "concluido", concluido_em: new Date().toISOString() }
                  : { status: "pendente", concluido_em: null },
              )
              .eq("id", concluir.dataset.concluir ?? concluir.dataset.reabrir ?? "");
            if (erro) return avisar(mensagemDeErro(erro), "erro");
            avisar(feito ? "Prazo concluído." : "Prazo reaberto.");
            recarregarTela();
          }
        },
        { signal: sinal },
      );
    },
  };
}

function novoPrazo() {
  abrirFolha(
    html`<h2 class="t">Novo prazo</h2>
      <form id="form-prazo" class="pd" novalidate>
        ${campo({ nome: "titulo", rotulo: "Obrigação", obrigatorio: true, max: 200, dica: "Ex.: DCTFWeb de outubro" })}
        ${campo({
          nome: "empresa_id",
          rotulo: "Cliente",
          tipo: "select",
          opcoes: [
            ["", "Do escritório (sem cliente)"],
            ...estado.empresas.map((e) => /** @type {[string, string]} */ ([e.id, nomeDaEmpresa(e)])),
          ],
        })}
        ${campo({ nome: "vencimento", rotulo: "Vencimento", tipo: "date", obrigatorio: true })}
        ${campo({
          nome: "responsavel_id",
          rotulo: "Responsável",
          tipo: "select",
          valor: estado.perfil?.id,
          opcoes: [
            ["", "Ninguém ainda"],
            ...estado.equipe.map((p) => /** @type {[string, string]} */ ([p.id, p.nome || p.email])),
          ],
        })}
        <button type="submit" class="btn">Salvar prazo</button>
        <p class="erro-form" role="alert"></p>
      </form>`,
  );
  const form = /** @type {HTMLFormElement} */ (document.getElementById("form-prazo"));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const erro = /** @type {HTMLElement} */ (form.querySelector(".erro-form"));
    const falta = conferirObrigatorios(form);
    if (falta) return void (erro.textContent = falta);
    const d = lerFormulario(form);
    try {
      await comCarregando(form.querySelector("button"), async () => {
        const { error } = await db()
          .from("prazos")
          .insert({
            titulo: d.titulo,
            empresa_id: d.empresa_id || null,
            vencimento: d.vencimento,
            responsavel_id: d.responsavel_id || null,
          });
        if (error) throw error;
      });
      fecharFolha();
      avisar("Prazo salvo.");
      recarregarTela();
    } catch (x) {
      erro.textContent = mensagemDeErro(x);
    }
  });
}
