/**
 * Estado do app enquanto a pessoa usa: quem está logado, quais empresas ela vê e
 * qual empresa está aberta. Tudo vem do banco; aqui só guardamos em memória.
 */
import { db } from "../../compartilhado/js/supabase.js";

/** @typedef {import("../../tipos").Perfil} Perfil */
/** @typedef {import("../../tipos").Empresa} Empresa */

const CHAVE_EMPRESA = "locus-empresa-ativa";

export const estado = {
  /** @type {Perfil | null} */
  perfil: null,
  /** @type {Empresa[]} */
  empresas: [],
  /** @type {string | null} */
  empresaId: null,
  /** @type {Perfil[]} */
  equipe: [],
};

export function ehEquipe() {
  return estado.perfil?.papel === "equipe";
}

/** Empresa aberta no app do cliente. */
export function empresaAtiva() {
  return estado.empresas.find((e) => e.id === estado.empresaId) ?? estado.empresas[0] ?? null;
}

/** @param {string} id */
export function escolherEmpresa(id) {
  estado.empresaId = id;
  try {
    localStorage.setItem(CHAVE_EMPRESA, id);
  } catch (_) {
    /* sem armazenamento: vale só nesta visita */
  }
}

/** Busca as empresas que a pessoa pode ver (as regras do banco filtram). */
export async function carregarEmpresas() {
  const { data, error } = await db()
    .from("empresas")
    .select("id, razao_social, nome_fantasia, documento, regime, responsavel_id, ativo")
    .order("razao_social");
  if (error) throw error;
  estado.empresas = data ?? [];
  let salva = null;
  try {
    salva = localStorage.getItem(CHAVE_EMPRESA);
  } catch (_) {
    salva = null;
  }
  estado.empresaId = estado.empresas.some((e) => e.id === salva) ? salva : (estado.empresas[0]?.id ?? null);
}

/** Pessoas da equipe Lócus, para escolher responsável e mostrar quem respondeu. */
export async function carregarEquipe() {
  const { data, error } = await db()
    .from("perfis")
    .select("id, nome, email, telefone, papel, ativo, trocar_senha")
    .eq("papel", "equipe")
    .order("nome");
  if (error) throw error;
  estado.equipe = data ?? [];
}

/**
 * Nome curto de uma empresa (fantasia ou razão social).
 * @param {Empresa | null | undefined} empresa
 */
export function nomeDaEmpresa(empresa) {
  return empresa ? empresa.nome_fantasia || empresa.razao_social : "";
}

/**
 * Nome da empresa pelo id (para listas da equipe).
 * @param {string | null} id
 */
export function nomeDaEmpresaPorId(id) {
  return nomeDaEmpresa(estado.empresas.find((e) => e.id === id));
}

/**
 * Nome de alguém da equipe pelo id.
 * @param {string | null} id
 */
export function nomeDaEquipe(id) {
  return estado.equipe.find((p) => p.id === id)?.nome ?? "";
}
