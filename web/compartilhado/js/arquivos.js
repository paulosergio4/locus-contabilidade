/**
 * Envio e download de arquivos no Supabase Storage.
 * Caminho de todo arquivo: <id da empresa>/<pasta>/<data>-<aleatório>-<nome>
 * As regras do banco conferem o caminho: cliente só grava em documentos da própria empresa.
 */
import { db } from "./supabase.js";
import { nomeDeArquivoSeguro } from "./formatos.js";

export const BUCKET = "arquivos";
export const TAMANHO_MAXIMO = 25 * 1024 * 1024;

/**
 * Monta um caminho único para o arquivo.
 * @param {string} empresaId
 * @param {"documentos" | "guias" | "entregas"} pasta
 * @param {string} nomeOriginal
 * @returns {string}
 */
export function caminhoDoArquivo(empresaId, pasta, nomeOriginal) {
  const data = new Date().toISOString().slice(0, 10);
  const aleatorio = crypto.randomUUID().slice(0, 8);
  return `${empresaId}/${pasta}/${data}-${aleatorio}-${nomeDeArquivoSeguro(nomeOriginal)}`;
}

/**
 * Envia um arquivo e devolve o caminho salvo.
 * @param {string} empresaId
 * @param {"documentos" | "guias" | "entregas"} pasta
 * @param {File} arquivo
 * @returns {Promise<string>}
 */
export async function enviarArquivo(empresaId, pasta, arquivo) {
  if (arquivo.size > TAMANHO_MAXIMO) throw new Error("Arquivo grande demais (máximo 25 MB).");
  const caminho = caminhoDoArquivo(empresaId, pasta, arquivo.name);
  const { error } = await db()
    .storage.from(BUCKET)
    .upload(caminho, arquivo, { contentType: arquivo.type || undefined, upsert: false });
  if (error) throw error;
  return caminho;
}

/**
 * Apaga um arquivo (usado para desfazer um envio que falhou no meio).
 * @param {string} caminho
 */
export async function apagarArquivo(caminho) {
  await db().storage.from(BUCKET).remove([caminho]);
}

/**
 * Link temporário (10 minutos) para abrir ou baixar o arquivo.
 * @param {string} caminho
 * @param {string} [nomeParaBaixar] se informado, o navegador baixa com esse nome
 * @returns {Promise<string>}
 */
export async function linkTemporario(caminho, nomeParaBaixar) {
  const { data, error } = await db()
    .storage.from(BUCKET)
    .createSignedUrl(caminho, 600, nomeParaBaixar ? { download: nomeParaBaixar } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Baixa o conteúdo do arquivo (usado pelo painel para ler a planilha).
 * @param {string} caminho
 * @returns {Promise<ArrayBuffer>}
 */
export async function lerArquivo(caminho) {
  const { data, error } = await db().storage.from(BUCKET).download(caminho);
  if (error) throw error;
  return data.arrayBuffer();
}
