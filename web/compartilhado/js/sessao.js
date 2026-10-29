/**
 * Login, logout e perfil da pessoa logada.
 * O Supabase Auth guarda a sessão no navegador e renova sozinho o acesso.
 */
import { db } from "./supabase.js";

/**
 * @typedef {import("../../tipos").Perfil} Perfil
 */

/**
 * Entra com e-mail e senha.
 * @param {string} email
 * @param {string} senha
 */
export async function entrar(email, senha) {
  const { error } = await db().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: senha,
  });
  if (error) throw error;
}

/** Sai da conta neste aparelho. */
export async function sair() {
  await db().auth.signOut();
}

/**
 * Perfil de quem está logado, ou null se ninguém estiver.
 * @returns {Promise<Perfil | null>}
 */
export async function perfilAtual() {
  const {
    data: { session },
  } = await db().auth.getSession();
  if (!session) return null;
  const { data, error } = await db()
    .from("perfis")
    .select("id, nome, email, telefone, papel, ativo, trocar_senha")
    .eq("id", session.user.id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Troca a senha de quem está logado e tira o aviso de senha provisória.
 * @param {string} novaSenha
 */
export async function trocarSenha(novaSenha) {
  const { error } = await db().auth.updateUser({ password: novaSenha });
  if (error) throw error;
  const { error: erroAviso } = await db().rpc("senha_trocada");
  if (erroAviso) throw erroAviso;
}

/**
 * Manda o e-mail para criar uma senha nova (precisa do SMTP configurado no Supabase).
 * @param {string} email
 * @param {string} voltarPara endereço que o link do e-mail abre
 */
export async function pedirNovaSenha(email, voltarPara) {
  const { error } = await db().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: voltarPara,
  });
  if (error) throw error;
}

/**
 * Avisa quando a pessoa entra ou sai (inclusive em outra aba).
 * @param {(evento: string) => void} aoMudar
 */
export function observarSessao(aoMudar) {
  db().auth.onAuthStateChange((evento) => aoMudar(evento));
}
