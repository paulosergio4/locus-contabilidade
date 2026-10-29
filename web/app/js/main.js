/**
 * Ponto de partida do app Lócus.
 * 1. aplica o tema e registra o modo instalável;
 * 2. confere se há alguém logado;
 * 3. carrega perfil e empresas e abre as telas do papel da pessoa (cliente ou equipe).
 */
import { supabaseConfigurado } from "../../compartilhado/js/config.js";
import { observarSessao, perfilAtual } from "../../compartilhado/js/sessao.js";
import { db, mensagemDeErro } from "../../compartilhado/js/supabase.js";
import { aplicarTema, avisar, prepararFolha, temaSalvo } from "../../compartilhado/js/ui.js";
import { carregarEmpresas, carregarEquipe, estado } from "./estado.js";
import { iniciarNavegacao, recarregar } from "./navegacao.js";
import { atualizarSelos } from "./selos.js";
import { mostrarEmPreparacao, mostrarLogin, mostrarTrocaDeSenha } from "./telas/login.js";

const app = () => /** @type {HTMLElement} */ (document.getElementById("app"));
let navegacaoLigada = false;

async function abrirApp() {
  const perfil = await perfilAtual();
  if (!perfil) return mostrarLogin(abrirApp);
  if (!perfil.ativo) {
    avisar("Este acesso foi desativado. Fale com a Lócus.", "erro");
    await db().auth.signOut();
    return mostrarLogin(abrirApp);
  }
  if (perfil.trocar_senha) return mostrarTrocaDeSenha(abrirApp);

  estado.perfil = perfil;
  await Promise.all([carregarEmpresas(), carregarEquipe()]);
  app().hidden = false;
  if (navegacaoLigada) recarregar();
  else {
    navegacaoLigada = true;
    iniciarNavegacao();
  }
  atualizarSelos().catch(() => {});
}

async function iniciar() {
  aplicarTema(temaSalvo());
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  if (!supabaseConfigurado()) return mostrarEmPreparacao();

  prepararFolha();
  observarSessao((evento) => {
    if (evento === "SIGNED_OUT") {
      app().hidden = true;
      estado.perfil = null;
      mostrarLogin(abrirApp);
    }
    if (evento === "PASSWORD_RECOVERY") mostrarTrocaDeSenha(abrirApp);
  });
  try {
    await abrirApp();
  } catch (erro) {
    avisar(mensagemDeErro(erro), "erro");
    mostrarLogin(abrirApp);
  }
}

iniciar();
