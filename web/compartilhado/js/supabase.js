/**
 * Cliente único do Supabase, usado por todas as telas.
 * A biblioteca é carregada antes, como script comum (web/compartilhado/vendor/supabase.js),
 * e expõe o objeto global `supabase`.
 */
import { CONFIG, supabaseConfigurado } from "./config.js";

/** @type {import("../../tipos").ClienteSupabase | null} */
let cliente = null;

/**
 * Devolve o cliente do Supabase, criando na primeira chamada.
 * @returns {import("../../tipos").ClienteSupabase}
 */
export function db() {
  if (cliente) return cliente;
  if (!supabaseConfigurado()) {
    throw new Error("O Supabase ainda não foi configurado (web/compartilhado/js/config.js).");
  }
  cliente = globalThis.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseChave, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return cliente;
}

/**
 * Transforma o erro do Supabase numa frase que a pessoa entende.
 * @param {unknown} erro
 * @returns {string}
 */
export function mensagemDeErro(erro) {
  const texto = erro && typeof erro === "object" && "message" in erro ? String(erro.message) : String(erro);
  if (/Invalid login credentials/i.test(texto)) return "E-mail ou senha não conferem.";
  if (/Email not confirmed/i.test(texto)) return "Confirme o seu e-mail antes de entrar.";
  if (/Password should be at least/i.test(texto)) return "A senha precisa ter pelo menos 8 caracteres.";
  if (/row-level security|permission denied/i.test(texto)) return "Você não tem permissão para isso.";
  if (/duplicate key|already exists/i.test(texto)) return "Esse registro já existe.";
  if (/Failed to fetch|NetworkError|network/i.test(texto))
    return "Sem conexão. Confira a internet e tente de novo.";
  if (/exceeded the maximum allowed size|Payload too large/i.test(texto))
    return "Arquivo grande demais (máximo 25 MB).";
  if (/mime type .* is not supported/i.test(texto)) return "Esse tipo de arquivo não é aceito.";
  return texto || "Algo deu errado. Tente de novo.";
}
