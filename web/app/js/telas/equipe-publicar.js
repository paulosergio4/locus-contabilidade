/**
 * Equipe · Publicar: manda uma guia ou um documento (balancete, holerite, planilha do
 * painel) para o app do cliente. O cliente recebe um aviso na hora, pelo gatilho do banco.
 * O endereço #/publicar/<id da empresa> já abre com a empresa escolhida.
 */
import { apagarArquivo, enviarArquivo } from "../../../compartilhado/js/arquivos.js";
import { centavosDeTexto, competenciaDeMes } from "../../../compartilhado/js/formatos.js";
import { html } from "../../../compartilhado/js/html.js";
import { ic } from "../../../compartilhado/js/icones.js";
import { db, mensagemDeErro } from "../../../compartilhado/js/supabase.js";
import { avisar, comCarregando } from "../../../compartilhado/js/ui.js";
import { campo, conferirObrigatorios, lerFormulario, recarregarTela, titulo, vazio } from "../componentes.js";
import { estado, nomeDaEmpresa } from "../estado.js";
import { CATEGORIA_ENTREGA, TIPOS_DE_GUIA } from "../rotulos.js";

let modo = "guia";

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** @param {import("../navegacao.js").Contexto} ctx */
export async function montar(ctx) {
  const empresas = estado.empresas.filter((e) => e.ativo);
  if (!empresas.length) {
    return {
      conteudo: html`${titulo("Publicar para o cliente")}${vazio("Cadastre um cliente antes de publicar.")}`,
    };
  }
  const opcoesEmpresa = empresas.map((e) => /** @type {[string, string]} */ ([e.id, nomeDaEmpresa(e)]));
  const empresaInicial = ctx.parametro ?? opcoesEmpresa[0][0];

  const formGuia = html`<form id="form-publicar" class="pd" novalidate>
    ${campo({ nome: "empresa_id", rotulo: "Cliente", tipo: "select", obrigatorio: true, opcoes: opcoesEmpresa, valor: empresaInicial })}
    ${campo({ nome: "tipo", rotulo: "Guia", tipo: "select", obrigatorio: true, opcoes: TIPOS_DE_GUIA.map((t) => [t, t]) })}
    <div class="grid2">
      ${campo({ nome: "competencia", rotulo: "Competência", tipo: "month", obrigatorio: true, valor: mesAtual() })}
      ${campo({ nome: "vencimento", rotulo: "Vencimento", tipo: "date", obrigatorio: true })}
    </div>
    ${campo({ nome: "valor", rotulo: "Valor", obrigatorio: true, modo: "decimal", dica: "R$ 0,00", max: 20 })}
    ${campo({ nome: "linha_digitavel", rotulo: "Código de barras (linha digitável)", modo: "numeric", max: 80 })}
    ${campo({ nome: "pix_copia_cola", rotulo: "PIX copia e cola", tipo: "area", linhas: 2, max: 600 })}
    ${campo({ nome: "descricao", rotulo: "Observação para o cliente", max: 300 })}
    ${campo({ nome: "arquivo", rotulo: "PDF da guia", tipo: "file", aceitar: ".pdf" })}
    <button type="submit" class="btn">${ic("up")}Publicar e avisar o cliente</button>
    <p class="erro-form" role="alert"></p>
  </form>`;

  const formEntrega = html`<form id="form-publicar" class="pd" novalidate>
    ${campo({ nome: "empresa_id", rotulo: "Cliente", tipo: "select", obrigatorio: true, opcoes: opcoesEmpresa, valor: empresaInicial })}
    ${campo({ nome: "categoria", rotulo: "O que é", tipo: "select", obrigatorio: true, opcoes: Object.entries(CATEGORIA_ENTREGA) })}
    ${campo({ nome: "titulo", rotulo: "Título", obrigatorio: true, max: 200, dica: "Ex.: Balancete de outubro" })}
    ${campo({ nome: "competencia", rotulo: "Competência", tipo: "month", valor: mesAtual() })}
    ${campo({ nome: "arquivo", rotulo: "Arquivo", tipo: "file", obrigatorio: true })}
    <p class="s">Para o painel, escolha "Painel de diagnóstico" e envie a planilha de lançamentos (.xlsx).</p>
    <button type="submit" class="btn">${ic("up")}Publicar e avisar o cliente</button>
    <p class="erro-form" role="alert"></p>
  </form>`;

  return {
    conteudo: html`${titulo("Publicar para o cliente", "O que você publicar aparece no app do cliente, com aviso.")}
      <div class="seg" role="group" aria-label="O que publicar">
        <button type="button" data-modo="guia" aria-pressed="${modo === "guia"}">Guia</button>
        <button type="button" data-modo="entrega" aria-pressed="${modo === "entrega"}">
          Documento ou relatório
        </button>
      </div>
      ${modo === "guia" ? formGuia : formEntrega}`,
    /** @param {HTMLElement} raiz @param {AbortSignal} sinal */
    aoMontar(raiz, sinal) {
      raiz.addEventListener(
        "click",
        (e) => {
          const botao = e.target instanceof Element ? e.target.closest("[data-modo]") : null;
          if (botao instanceof HTMLElement && botao.dataset.modo) {
            modo = botao.dataset.modo;
            recarregarTela();
          }
        },
        { signal: sinal },
      );
      const form = /** @type {HTMLFormElement} */ (raiz.querySelector("#form-publicar"));
      form.addEventListener("submit", (e) => publicar(e, form), { signal: sinal });
    },
  };
}

/**
 * @param {SubmitEvent} e
 * @param {HTMLFormElement} form
 */
async function publicar(e, form) {
  e.preventDefault();
  const erro = /** @type {HTMLElement} */ (form.querySelector(".erro-form"));
  const falta = conferirObrigatorios(form);
  if (falta) return void (erro.textContent = falta);
  erro.textContent = "";
  const d = lerFormulario(form);
  const arquivo = /** @type {HTMLInputElement} */ (form.querySelector('input[type="file"]')).files?.[0];

  if (modo === "guia") {
    const valor = centavosDeTexto(d.valor);
    if (valor === null) return void (erro.textContent = "Valor inválido. Use o formato 1.234,56.");
    try {
      await comCarregando(form.querySelector('button[type="submit"]'), async () => {
        const caminho = arquivo ? await enviarArquivo(d.empresa_id, "guias", arquivo) : null;
        const { error } = await db()
          .from("guias")
          .insert({
            empresa_id: d.empresa_id,
            tipo: d.tipo,
            competencia: competenciaDeMes(d.competencia),
            vencimento: d.vencimento,
            valor_centavos: valor,
            linha_digitavel: d.linha_digitavel || null,
            pix_copia_cola: d.pix_copia_cola || null,
            descricao: d.descricao || null,
            caminho,
          });
        if (error) {
          if (caminho) await apagarArquivo(caminho);
          throw error;
        }
      });
      avisar("Guia publicada. O cliente já recebeu o aviso.");
      form.reset();
    } catch (x) {
      erro.textContent = mensagemDeErro(x);
    }
    return;
  }

  if (!arquivo) return;
  try {
    await comCarregando(form.querySelector('button[type="submit"]'), async () => {
      const caminho = await enviarArquivo(d.empresa_id, "entregas", arquivo);
      const { error } = await db()
        .from("entregas")
        .insert({
          empresa_id: d.empresa_id,
          categoria: d.categoria,
          titulo: d.titulo,
          competencia: competenciaDeMes(d.competencia),
          caminho,
          nome_arquivo: arquivo.name.slice(0, 255),
        });
      if (error) {
        await apagarArquivo(caminho);
        throw error;
      }
    });
    avisar("Documento publicado. O cliente já recebeu o aviso.");
    form.reset();
  } catch (x) {
    erro.textContent = mensagemDeErro(x);
  }
}
