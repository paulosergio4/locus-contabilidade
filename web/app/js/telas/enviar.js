/**
 * Enviar documento: o cliente manda extrato, nota, contrato ou foto de um papel.
 * O arquivo vai primeiro para o Storage e depois o registro entra na tabela documentos.
 * Se o registro falhar, o arquivo enviado é apagado para não sobrar lixo.
 */
import { apagarArquivo, enviarArquivo } from "../../../compartilhado/js/arquivos.js";
import { competenciaBR, competenciaDeMes, dataHoraBR } from "../../../compartilhado/js/formatos.js";
import { html } from "../../../compartilhado/js/html.js";
import { ic } from "../../../compartilhado/js/icones.js";
import { db, mensagemDeErro } from "../../../compartilhado/js/supabase.js";
import { avisar, comCarregando } from "../../../compartilhado/js/ui.js";
import {
  campo,
  conferirObrigatorios,
  item,
  lerFormulario,
  pill,
  recarregarTela,
  titulo,
  vazio,
} from "../componentes.js";
import { empresaAtiva, estado } from "../estado.js";
import { CATEGORIA_DOCUMENTO, STATUS_DOCUMENTO } from "../rotulos.js";

/** @typedef {import("../../../tipos").Documento} Documento */

const ACEITOS = ".pdf,.xml,.jpg,.jpeg,.png,.webp,.heic,.csv,.txt,.ofx,.xls,.xlsx,.docx,.zip";

function mesAnterior() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** @param {import("../navegacao.js").Contexto} _ctx */
export async function montar(_ctx) {
  const empresa = empresaAtiva();
  if (!empresa)
    return { conteudo: html`${titulo("Enviar documento")}${vazio("Nenhuma empresa ligada ao seu acesso.")}` };

  const { data, error } = await db()
    .from("documentos")
    .select("id, categoria, competencia, nome_arquivo, status, criado_em")
    .eq("empresa_id", empresa.id)
    .order("criado_em", { ascending: false })
    .limit(15);
  if (error) throw error;
  /** @type {Documento[]} */
  const enviados = /** @type {any} */ (data) ?? [];

  const conteudo = html`${titulo("Enviar documento", "Extratos, notas, contratos, atestados ou qualquer papel da empresa.")}
    <form id="form-enviar" class="pd" novalidate>
      ${campo({
        nome: "arquivo",
        rotulo: "Arquivo ou foto",
        tipo: "file",
        obrigatorio: true,
        aceitar: ACEITOS,
      })}
      ${campo({
        nome: "categoria",
        rotulo: "O que é",
        tipo: "select",
        obrigatorio: true,
        opcoes: Object.entries(CATEGORIA_DOCUMENTO),
        valor: "extrato",
      })}
      ${campo({ nome: "competencia", rotulo: "Mês a que se refere", tipo: "month", valor: mesAnterior() })}
      ${campo({ nome: "descricao", rotulo: "Observação", tipo: "area", linhas: 2, max: 500, dica: "Ex.: extrato da conta do Sicoob" })}
      <button class="btn" type="submit">${ic("up")}Enviar para a Lócus</button>
      <p class="erro-form" role="alert"></p>
    </form>
    <p class="s">Notas de compra emitidas contra o seu CNPJ a Lócus também busca direto na Receita.</p>

    <div class="sec">Enviados recentemente</div>
    <div class="stack">
      ${
        enviados.length
          ? enviados.map((d) =>
              item({
                icone: "file",
                titulo: d.nome_arquivo,
                detalhe: `${CATEGORIA_DOCUMENTO[d.categoria]}${d.competencia ? ` · ${competenciaBR(d.competencia)}` : ""} · ${dataHoraBR(d.criado_em)}`,
                direita: pill(STATUS_DOCUMENTO[d.status]),
              }),
            )
          : vazio("Os documentos que você enviar aparecem aqui.")
      }
    </div>`;

  return {
    conteudo,
    /** @param {HTMLElement} raiz @param {AbortSignal} sinal */
    aoMontar(raiz, sinal) {
      const form = /** @type {HTMLFormElement} */ (raiz.querySelector("#form-enviar"));
      const erro = /** @type {HTMLElement} */ (form.querySelector(".erro-form"));
      form.addEventListener(
        "submit",
        async (e) => {
          e.preventDefault();
          const falta = conferirObrigatorios(form);
          if (falta) return void (erro.textContent = falta);
          erro.textContent = "";
          const arquivo = /** @type {HTMLInputElement} */ (form.querySelector('input[type="file"]'))
            .files?.[0];
          if (!arquivo) return;
          const dados = lerFormulario(form);
          try {
            await comCarregando(form.querySelector("button"), async () => {
              const caminho = await enviarArquivo(empresa.id, "documentos", arquivo);
              const { error: erroRegistro } = await db()
                .from("documentos")
                .insert({
                  empresa_id: empresa.id,
                  enviado_por: estado.perfil?.id,
                  categoria: dados.categoria,
                  competencia: competenciaDeMes(dados.competencia),
                  descricao: dados.descricao || null,
                  caminho,
                  nome_arquivo: arquivo.name.slice(0, 255),
                  tamanho_bytes: arquivo.size,
                });
              if (erroRegistro) {
                await apagarArquivo(caminho);
                throw erroRegistro;
              }
            });
            avisar("Documento enviado. A Lócus já recebeu.");
            recarregarTela();
          } catch (x) {
            erro.textContent = mensagemDeErro(x);
          }
        },
        { signal: sinal },
      );
    },
  };
}
