/**
 * Telas de entrada: login, "esqueci a senha" e troca de senha
 * (senha provisória no primeiro acesso ou link de recuperação por e-mail).
 */
import { CONFIG } from "../../../compartilhado/js/config.js";
import { html, pintar } from "../../../compartilhado/js/html.js";
import { entrar, pedirNovaSenha, trocarSenha } from "../../../compartilhado/js/sessao.js";
import { mensagemDeErro } from "../../../compartilhado/js/supabase.js";
import { avisar, comCarregando } from "../../../compartilhado/js/ui.js";
import { campo, lerFormulario } from "../componentes.js";

const caixa = () => /** @type {HTMLElement} */ (document.getElementById("login-conteudo"));
const secao = () => /** @type {HTMLElement} */ (document.getElementById("login"));

/** @param {HTMLFormElement} form @param {string} texto */
function erro(form, texto) {
  /** @type {HTMLElement} */ (form.querySelector(".erro-form")).textContent = texto;
}

/**
 * Mostra o login. `aoEntrar` roda depois que a senha confere.
 * @param {() => Promise<void>} aoEntrar
 */
export function mostrarLogin(aoEntrar) {
  secao().hidden = false;
  pintar(
    caixa(),
    html`<h3 id="login-titulo">Olá! Que bom ter você por aqui.</h3>
      <p>Entre para ver suas guias, seus números e falar com a Lócus.</p>
      <form id="form-login" novalidate>
        ${campo({ nome: "email", rotulo: "E-mail", tipo: "email", obrigatorio: true, modo: "email" })}
        ${campo({ nome: "senha", rotulo: "Senha", tipo: "password", obrigatorio: true })}
        <button class="btn" type="submit">Entrar</button>
        <p class="erro-form" role="alert"></p>
      </form>
      <button type="button" class="btn ghost" id="esqueci">Esqueci a senha</button>
      <div class="sp"></div>
      <p class="s">Primeiro acesso? A Lócus manda o seu login e uma senha provisória pelo WhatsApp.</p>`,
  );
  const form = /** @type {HTMLFormElement} */ (document.getElementById("form-login"));
  form.querySelector("input")?.setAttribute("autocomplete", "username");
  form.querySelector('input[type="password"]')?.setAttribute("autocomplete", "current-password");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const { email, senha } = lerFormulario(form);
    if (!email || !senha) return erro(form, "Preencha e-mail e senha.");
    erro(form, "");
    try {
      await comCarregando(form.querySelector("button"), () => entrar(email, senha));
      secao().hidden = true;
      await aoEntrar();
    } catch (x) {
      erro(form, mensagemDeErro(x));
    }
  });
  document.getElementById("esqueci")?.addEventListener("click", () => mostrarEsqueci(aoEntrar));
}

/** @param {() => Promise<void>} aoEntrar */
function mostrarEsqueci(aoEntrar) {
  pintar(
    caixa(),
    html`<h3 id="login-titulo">Criar uma senha nova</h3>
      <p>Informe o seu e-mail. Mandamos um link para você escolher a senha nova.</p>
      <form id="form-esqueci" novalidate>
        ${campo({ nome: "email", rotulo: "E-mail", tipo: "email", obrigatorio: true, modo: "email" })}
        <button class="btn" type="submit">Enviar link</button>
        <p class="erro-form" role="alert"></p>
      </form>
      <button type="button" class="btn ghost" id="voltar-login">Voltar</button>
      <div class="sp"></div>
      <p class="s">Não chegou? Fale com a Lócus no WhatsApp que a gente cria uma senha provisória.</p>`,
  );
  const form = /** @type {HTMLFormElement} */ (document.getElementById("form-esqueci"));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const { email } = lerFormulario(form);
    if (!email) return erro(form, "Informe o e-mail.");
    try {
      await comCarregando(form.querySelector("button"), () => pedirNovaSenha(email, CONFIG.urlApp));
      avisar("Se o e-mail estiver cadastrado, o link chega em alguns minutos.");
      mostrarLogin(aoEntrar);
    } catch (x) {
      erro(form, mensagemDeErro(x));
    }
  });
  document.getElementById("voltar-login")?.addEventListener("click", () => mostrarLogin(aoEntrar));
}

/**
 * Pede uma senha nova (primeiro acesso com senha provisória ou link de recuperação).
 * @param {() => Promise<void>} aoTrocar
 */
export function mostrarTrocaDeSenha(aoTrocar) {
  secao().hidden = false;
  /** @type {HTMLElement} */ (document.getElementById("app")).hidden = true;
  pintar(
    caixa(),
    html`<h3 id="login-titulo">Escolha a sua senha</h3>
      <p>Use pelo menos 8 caracteres. Só você vai saber a senha nova.</p>
      <form id="form-senha" novalidate>
        ${campo({ nome: "senha", rotulo: "Senha nova", tipo: "password", obrigatorio: true })}
        ${campo({ nome: "repetir", rotulo: "Repita a senha", tipo: "password", obrigatorio: true })}
        <button class="btn" type="submit">Salvar senha</button>
        <p class="erro-form" role="alert"></p>
      </form>`,
  );
  const form = /** @type {HTMLFormElement} */ (document.getElementById("form-senha"));
  form.querySelectorAll("input").forEach((i) => i.setAttribute("autocomplete", "new-password"));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const { senha, repetir } = lerFormulario(form);
    if (senha.length < 8) return erro(form, "A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== repetir) return erro(form, "As duas senhas estão diferentes.");
    try {
      await comCarregando(form.querySelector("button"), () => trocarSenha(senha));
      avisar("Senha salva.");
      secao().hidden = true;
      await aoTrocar();
    } catch (x) {
      erro(form, mensagemDeErro(x));
    }
  });
}

/** Mensagem quando o app ainda não foi ligado ao Supabase. */
export function mostrarEmPreparacao() {
  secao().hidden = false;
  pintar(
    caixa(),
    html`<h3 id="login-titulo">O app está quase pronto.</h3>
      <p>Estamos terminando de preparar o acesso. Enquanto isso, fale com a Lócus pelo WhatsApp.</p>
      <a class="btn" href="https://wa.me/${CONFIG.whatsapp}" rel="noopener">Falar no WhatsApp</a>`,
  );
}
