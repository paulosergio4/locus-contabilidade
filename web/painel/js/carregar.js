/**
 * Abre no painel a planilha de diagnóstico publicada para o cliente.
 * O app chama esta página com ?entrega=<id>. Se não houver esse parâmetro, o painel
 * continua funcionando como antes: a equipe arrasta a planilha para a tela.
 */
import { lerArquivo } from "../../compartilhado/js/arquivos.js";
import { supabaseConfigurado } from "../../compartilhado/js/config.js";
import { db, mensagemDeErro } from "../../compartilhado/js/supabase.js";

/** @param {string} texto */
function mostrarErro(texto) {
  const caixa = document.getElementById("err");
  if (!caixa) return;
  caixa.textContent = texto;
  caixa.hidden = false;
}

async function carregar() {
  const id = new URLSearchParams(location.search).get("entrega");
  if (!id || !supabaseConfigurado()) return;
  const voltar = document.getElementById("voltar-app");
  if (voltar) voltar.hidden = false;

  const {
    data: { session },
  } = await db().auth.getSession();
  if (!session) {
    location.href = "../app/";
    return;
  }
  try {
    const { data, error } = await db()
      .from("entregas")
      .select("caminho, nome_arquivo")
      .eq("id", id)
      .eq("categoria", "diagnostico")
      .single();
    if (error) throw error;
    const conteudo = await lerArquivo(data.caminho);
    const abrir = /** @type {any} */ (window).__abrirPlanilha;
    if (typeof XLSX === "undefined" || typeof abrir !== "function") {
      throw new Error("Não consegui carregar o leitor de planilhas. Recarregue a página.");
    }
    abrir(conteudo, data.nome_arquivo);
  } catch (erro) {
    mostrarErro(mensagemDeErro(erro));
  }
}

carregar();
