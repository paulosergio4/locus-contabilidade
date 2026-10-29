/**
 * Chamados (pedidos): o cliente abre pedidos de admissão, rescisão, férias ou dúvida
 * e conversa com a Lócus. A equipe vê todos, responde e muda o status.
 */
import { dataBR, dataHoraBR } from "../../../compartilhado/js/formatos.js";
import { html } from "../../../compartilhado/js/html.js";
import { ic } from "../../../compartilhado/js/icones.js";
import { db, mensagemDeErro } from "../../../compartilhado/js/supabase.js";
import { abrirFolha, avisar, comCarregando, fecharFolha } from "../../../compartilhado/js/ui.js";
import {
  campo,
  conferirObrigatorios,
  item,
  lerFormulario,
  linha,
  pill,
  recarregarTela,
  titulo,
  vazio,
} from "../componentes.js";
import { ehEquipe, empresaAtiva, estado, nomeDaEmpresaPorId, nomeDaEquipe } from "../estado.js";
import { CATEGORIA_CHAMADO, STATUS_CHAMADO } from "../rotulos.js";
import { atualizarSelos } from "../selos.js";

/** @typedef {import("../../../tipos").Chamado} Chamado */
/** @typedef {import("../../../tipos").Mensagem} Mensagem */
/** @typedef {import("../componentes.js").Campo} Campo */

const SIM_NAO = /** @type {Array<[string, string]>} */ ([
  ["Não", "Não"],
  ["Sim", "Sim"],
]);

/** Formulário de cada tipo de pedido. Os campos viram o JSON `dados` do chamado. */
/** @type {Record<string, { dica: string, campos: Campo[] }>} */
const PEDIDOS = {
  admissao: {
    dica: "Envie até o dia anterior ao primeiro dia de trabalho. A equipe responde em até 1 dia útil.",
    campos: [
      { nome: "nome", rotulo: "Nome completo", obrigatorio: true, max: 120 },
      { nome: "cpf", rotulo: "CPF", obrigatorio: true, modo: "numeric", max: 14 },
      { nome: "inicio", rotulo: "Primeiro dia de trabalho", tipo: "date", obrigatorio: true },
      { nome: "funcao", rotulo: "Função", obrigatorio: true, max: 80 },
      { nome: "salario", rotulo: "Salário", obrigatorio: true, modo: "decimal", max: 20 },
      {
        nome: "horario",
        rotulo: "Horário de trabalho",
        obrigatorio: true,
        max: 120,
        dica: "Ex.: seg a sáb, 8h às 17h",
      },
      { nome: "observacoes", rotulo: "Observações", tipo: "area", max: 1000 },
    ],
  },
  rescisao: {
    dica: "Avise no dia em que o funcionário sair. A equipe responde em até 1 dia útil.",
    campos: [
      { nome: "nome", rotulo: "Nome do funcionário", obrigatorio: true, max: 120 },
      { nome: "ultimo_dia", rotulo: "Último dia de trabalho", tipo: "date", obrigatorio: true },
      {
        nome: "tipo",
        rotulo: "Tipo de saída",
        tipo: "select",
        obrigatorio: true,
        opcoes: [
          "Pedido de demissão",
          "Dispensa sem justa causa",
          "Dispensa com justa causa",
          "Acordo entre as partes",
          "Fim do contrato de experiência",
        ].map((t) => [t, t]),
      },
      {
        nome: "aviso",
        rotulo: "Aviso prévio",
        tipo: "select",
        obrigatorio: true,
        opcoes: ["Trabalhado", "Indenizado", "Dispensado"].map((t) => [t, t]),
      },
      { nome: "observacoes", rotulo: "Observações", tipo: "area", max: 1000 },
    ],
  },
  ferias: {
    dica: "Peça com pelo menos 30 dias de antecedência. A equipe responde em até 1 dia útil.",
    campos: [
      { nome: "nome", rotulo: "Nome do funcionário", obrigatorio: true, max: 120 },
      { nome: "inicio", rotulo: "Primeiro dia de férias", tipo: "date", obrigatorio: true },
      {
        nome: "dias",
        rotulo: "Quantos dias",
        tipo: "select",
        obrigatorio: true,
        opcoes: ["30", "20", "15", "10"].map((t) => [t, `${t} dias`]),
      },
      {
        nome: "abono",
        rotulo: "Vender 10 dias (abono)?",
        tipo: "select",
        obrigatorio: true,
        opcoes: SIM_NAO,
      },
      {
        nome: "adiantar_13",
        rotulo: "Adiantar parte do 13º?",
        tipo: "select",
        obrigatorio: true,
        opcoes: SIM_NAO,
      },
      { nome: "observacoes", rotulo: "Observações", tipo: "area", max: 1000 },
    ],
  },
  duvida: {
    dica: "Escreva com as suas palavras. A equipe responde em até 1 dia útil.",
    campos: [
      {
        nome: "assunto",
        rotulo: "Assunto",
        obrigatorio: true,
        max: 120,
        dica: "Ex.: pró-labore, imposto, nota fiscal",
      },
      { nome: "duvida", rotulo: "Sua dúvida", tipo: "area", obrigatorio: true, max: 4000 },
    ],
  },
};

let soAbertos = true;

/** @param {import("../navegacao.js").Contexto} ctx */
export async function montar(ctx) {
  return ctx.parametro ? detalhe(ctx.parametro) : lista();
}

async function lista() {
  const equipe = ehEquipe();
  const empresa = empresaAtiva();
  if (!equipe && !empresa) {
    return {
      conteudo: html`${titulo("Falar com a Lócus")}${vazio("Nenhuma empresa ligada ao seu acesso.")}`,
    };
  }

  let consulta = db()
    .from("chamados")
    .select("id, empresa_id, categoria, assunto, status, atualizado_em, responsavel_id")
    .order("atualizado_em", { ascending: false })
    .limit(100);
  if (!equipe && empresa) consulta = consulta.eq("empresa_id", empresa.id);
  if (equipe && soAbertos) consulta = consulta.neq("status", "resolvido");
  const { data, error } = await consulta;
  if (error) throw error;
  /** @type {Chamado[]} */
  const chamados = /** @type {any} */ (data) ?? [];

  const cabecalho = equipe
    ? html`${titulo("Chamados", "Pedidos dos clientes. Toque para responder.")}
        <div class="seg" role="group" aria-label="Filtrar chamados">
          <button type="button" data-filtro="abertos" aria-pressed="${soAbertos}">Em aberto</button>
          <button type="button" data-filtro="todos" aria-pressed="${!soAbertos}">Todos</button>
        </div>`
    : html`${titulo("Falar com a Lócus", "Abra um pedido ou mande uma dúvida. A resposta chega aqui.")}
        <div class="grid2">
          ${Object.keys(PEDIDOS).map(
            (tipo) =>
              html`<button type="button" class="item" data-novo="${tipo}">
                <b>${CATEGORIA_CHAMADO[tipo]}</b>
              </button>`,
          )}
        </div>
        <div class="sec">Seus pedidos</div>`;

  return {
    conteudo: html`${cabecalho}
      <div class="stack">
        ${
          chamados.length
            ? chamados.map((c) =>
                item({
                  icone: "chat",
                  titulo: c.assunto,
                  detalhe: `${equipe ? `${nomeDaEmpresaPorId(c.empresa_id)} · ` : ""}${CATEGORIA_CHAMADO[c.categoria]} · ${dataHoraBR(c.atualizado_em)}`,
                  direita: pill(STATUS_CHAMADO[c.status]),
                  ir: `chamados/${c.id}`,
                }),
              )
            : vazio(equipe ? "Nenhum chamado em aberto." : "Seus pedidos aparecem aqui.")
        }
      </div>`,
    /** @param {HTMLElement} raiz @param {AbortSignal} sinal */
    aoMontar(raiz, sinal) {
      raiz.addEventListener(
        "click",
        (e) => {
          const alvo = e.target instanceof Element ? e.target : null;
          const filtro = alvo?.closest("[data-filtro]");
          if (filtro instanceof HTMLElement) {
            soAbertos = filtro.dataset.filtro === "abertos";
            recarregarTela();
            return;
          }
          const novo = alvo?.closest("[data-novo]");
          if (novo instanceof HTMLElement && novo.dataset.novo && empresa)
            abrirNovoPedido(novo.dataset.novo, empresa.id);
        },
        { signal: sinal },
      );
    },
  };
}

/**
 * Abre o formulário do pedido numa folha e cria o chamado ao enviar.
 * @param {string} tipo
 * @param {string} empresaId
 */
function abrirNovoPedido(tipo, empresaId) {
  const pedido = PEDIDOS[tipo];
  abrirFolha(
    html`<h2 class="t">Novo pedido · ${CATEGORIA_CHAMADO[tipo]}</h2>
      <p class="s">${pedido.dica}</p>
      <form id="form-pedido" class="pd" novalidate>
        ${pedido.campos.map(campo)}
        <button type="submit" class="btn">Enviar pedido</button>
        <p class="erro-form" role="alert"></p>
      </form>`,
  );
  const form = /** @type {HTMLFormElement} */ (document.getElementById("form-pedido"));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const erro = /** @type {HTMLElement} */ (form.querySelector(".erro-form"));
    const falta = conferirObrigatorios(form);
    if (falta) return void (erro.textContent = falta);
    const dados = lerFormulario(form);
    const assunto =
      tipo === "duvida" ? dados.assunto : `${CATEGORIA_CHAMADO[tipo]} · ${dados.nome ?? ""}`.trim();
    try {
      const id = await comCarregando(form.querySelector("button"), async () => {
        const { data, error } = await db()
          .from("chamados")
          .insert({ empresa_id: empresaId, aberto_por: estado.perfil?.id, categoria: tipo, assunto, dados })
          .select("id")
          .single();
        if (error) throw error;
        if (tipo === "duvida" && dados.duvida) {
          const { error: erroMsg } = await db()
            .from("chamado_mensagens")
            .insert({ chamado_id: data.id, texto: dados.duvida });
          if (erroMsg) throw erroMsg;
        }
        return data.id;
      });
      fecharFolha();
      avisar("Pedido enviado. A resposta chega aqui no app.");
      location.hash = `#/chamados/${id}`;
    } catch (x) {
      erro.textContent = mensagemDeErro(x);
    }
  });
}

/** @param {string} id */
async function detalhe(id) {
  const [{ data: chamado, error }, { data: mensagens, error: erroMsgs }] = await Promise.all([
    db().from("chamados").select("*").eq("id", id).maybeSingle(),
    db()
      .from("chamado_mensagens")
      .select("id, autor_id, texto, criado_em")
      .eq("chamado_id", id)
      .order("criado_em"),
  ]);
  if (error) throw error;
  if (erroMsgs) throw erroMsgs;
  /** @type {Chamado | null} */
  const c = chamado;
  if (!c) return { conteudo: titulo("Pedido não encontrado", "", { rota: "chamados", texto: "Voltar" }) };
  /** @type {Mensagem[]} */
  const conversa = /** @type {any} */ (mensagens) ?? [];
  const equipe = ehEquipe();
  const meuId = estado.perfil?.id;

  /** @param {string | null} autorId */
  const autor = (autorId) =>
    autorId === meuId ? "você" : nomeDaEquipe(autorId) ? `${nomeDaEquipe(autorId)} · Lócus` : "cliente";
  // Mostra os campos do pedido com o mesmo rótulo do formulário e datas no formato brasileiro.
  const camposDoPedido = PEDIDOS[c.categoria]?.campos ?? [];
  const dados = Object.entries(c.dados ?? {})
    .filter(([k, v]) => v && k !== "duvida")
    .map(([k, v]) => {
      const definicao = camposDoPedido.find((f) => f.nome === k);
      const valor = definicao?.tipo === "date" ? dataBR(v) : v;
      return /** @type {[string, string]} */ ([definicao?.rotulo ?? k.replaceAll("_", " "), valor]);
    });

  const controlesEquipe = equipe
    ? html`<div class="sec">Atendimento</div>
        <div class="grid2">
          ${campo({
            nome: "status",
            rotulo: "Status",
            tipo: "select",
            obrigatorio: true,
            valor: c.status,
            opcoes: Object.entries(STATUS_CHAMADO).map(([k, [t]]) => [k, t]),
          })}
          ${campo({
            nome: "responsavel",
            rotulo: "Responsável",
            tipo: "select",
            obrigatorio: true,
            valor: c.responsavel_id ?? "",
            opcoes: [
              ["", "Ninguém ainda"],
              ...estado.equipe.map((p) => /** @type {[string, string]} */ ([p.id, p.nome || p.email])),
            ],
          })}
        </div>`
    : "";

  const conteudo = html`${titulo(
    c.assunto,
    html`${pill(STATUS_CHAMADO[c.status])} ${equipe ? nomeDaEmpresaPorId(c.empresa_id) : ""}`,
    { rota: "chamados", texto: equipe ? "Chamados" : "Falar" },
  )}
    ${dados.length ? html`<div class="card stack">${dados.map(([k, v]) => linha(k, v))}</div>` : ""}
    ${controlesEquipe}
    <div class="sec">Conversa</div>
    <div class="chat">
      ${
        conversa.length
          ? conversa.map(
              (m) =>
                html`<div class="msg ${m.autor_id === meuId ? "me" : "them"}">
                  ${m.texto}<small>${autor(m.autor_id)} · ${dataHoraBR(m.criado_em)}</small>
                </div>`,
            )
          : vazio(equipe ? "Ainda sem mensagens. Responda o cliente abaixo." : "A Lócus vai responder aqui.")
      }
    </div>
    <form id="form-resposta" class="pd" novalidate>
      ${campo({ nome: "texto", rotulo: "Mensagem", tipo: "area", obrigatorio: true, max: 5000, linhas: 3 })}
      <button type="submit" class="btn">${ic("chat")}Enviar mensagem</button>
      <p class="erro-form" role="alert"></p>
    </form>`;

  return {
    conteudo,
    /** @param {HTMLElement} raiz @param {AbortSignal} sinal */
    aoMontar(raiz, sinal) {
      const form = /** @type {HTMLFormElement} */ (raiz.querySelector("#form-resposta"));
      form.addEventListener(
        "submit",
        async (e) => {
          e.preventDefault();
          const erro = /** @type {HTMLElement} */ (form.querySelector(".erro-form"));
          const falta = conferirObrigatorios(form);
          if (falta) return void (erro.textContent = falta);
          try {
            await comCarregando(form.querySelector("button"), async () => {
              const { error: erroEnvio } = await db()
                .from("chamado_mensagens")
                .insert({ chamado_id: c.id, texto: lerFormulario(form).texto });
              if (erroEnvio) throw erroEnvio;
            });
            avisar("Mensagem enviada.");
            recarregarTela();
          } catch (x) {
            erro.textContent = mensagemDeErro(x);
          }
        },
        { signal: sinal },
      );
      if (!equipe) return;
      raiz.querySelectorAll("#c-status, #c-responsavel").forEach((seletor) =>
        seletor.addEventListener(
          "change",
          async () => {
            const status = /** @type {HTMLSelectElement} */ (raiz.querySelector("#c-status")).value;
            const responsavel = /** @type {HTMLSelectElement} */ (raiz.querySelector("#c-responsavel")).value;
            const { error: erroAtualizar } = await db()
              .from("chamados")
              .update({ status, responsavel_id: responsavel || null })
              .eq("id", c.id);
            if (erroAtualizar) return avisar(mensagemDeErro(erroAtualizar), "erro");
            avisar("Chamado atualizado.");
            atualizarSelos().catch(() => {});
          },
          { signal: sinal },
        ),
      );
    },
  };
}
