/**
 * Números que aparecem nas abas: avisos não lidos (cliente) e pendências (equipe).
 * Quando um número muda, este módulo dispara o evento "selos-mudaram" e a navegação
 * repinta as abas. Assim as telas não dependem da navegação.
 */
import { db } from "../../compartilhado/js/supabase.js";
import { ehEquipe, empresaAtiva } from "./estado.js";

/** @type {Record<string, number>} */
export const selos = {};

/**
 * @param {string} rota
 * @param {number} quantidade
 */
function definir(rota, quantidade) {
  selos[rota] = quantidade;
}

/**
 * @param {string} tabela
 * @param {string} coluna
 * @param {string} valor
 */
async function contar(tabela, coluna, valor) {
  const { count } = await db().from(tabela).select("id", { count: "exact", head: true }).eq(coluna, valor);
  return count ?? 0;
}

/** Busca os números de novo e avisa a navegação. */
export async function atualizarSelos() {
  if (ehEquipe()) {
    const [docs, chamados, contatos] = await Promise.all([
      contar("documentos", "status", "recebido"),
      contar("chamados", "status", "aberto"),
      contar("contatos_site", "status", "novo"),
    ]);
    definir("entrada", docs);
    definir("chamados", chamados);
    definir("contatos", contatos);
  } else {
    const empresa = empresaAtiva();
    if (!empresa) return;
    const [{ data: avisos }, { data: lidos }] = await Promise.all([
      db()
        .from("avisos")
        .select("id")
        .eq("empresa_id", empresa.id)
        .order("criado_em", { ascending: false })
        .limit(50),
      db().from("avisos_lidos").select("aviso_id"),
    ]);
    const jaLidos = new Set((lidos ?? []).map((l) => l.aviso_id));
    definir("inicio", (avisos ?? []).filter((a) => !jaLidos.has(a.id)).length);
  }
  document.dispatchEvent(new CustomEvent("selos-mudaram"));
}
