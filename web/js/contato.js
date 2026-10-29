/**
 * Envio do formulário de contato do site para a Lócus.
 * Grava em contatos_site (o visitante só pode inserir; quem lê é a equipe, no app).
 * Sem Supabase configurado, o formulário abre o WhatsApp com a mensagem pronta.
 */
import { CONFIG, supabaseConfigurado } from "../compartilhado/js/config.js";
import { db, mensagemDeErro } from "../compartilhado/js/supabase.js";

const form = /** @type {HTMLFormElement | null} */ (document.getElementById("form-contato"));
const aviso = /** @type {HTMLElement | null} */ (document.getElementById("form-msg"));

/**
 * @param {string} texto
 * @param {boolean} [erro]
 */
function mostrar(texto, erro = false) {
  if (!aviso) return;
  aviso.textContent = texto;
  aviso.classList.toggle("erro", erro);
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const dados = Object.fromEntries(new FormData(form));
  /** @param {string} chave */
  const texto = (chave) => String(dados[chave] ?? "").trim();

  if (texto("site")) return; // robô preencheu o campo invisível
  if (texto("nome").length < 2) return mostrar("Preencha o seu nome para continuar.", true);
  if (!texto("tel") && !texto("email"))
    return mostrar("Deixe um WhatsApp ou e-mail para a gente responder.", true);
  if (!dados.consentimento) return mostrar("Marque a caixa de consentimento para enviar.", true);

  const registro = {
    nome: texto("nome").slice(0, 120),
    empresa: texto("empresa").slice(0, 200) || null,
    telefone: texto("tel").slice(0, 30) || null,
    email: texto("email").slice(0, 200) || null,
    interesse: texto("interesse").slice(0, 60) || null,
    mensagem: texto("msg").slice(0, 2000) || null,
    origem: texto("interesse") === "Diagnóstico gratuito" ? "diagnostico" : "contato",
    consentimento: true,
  };

  const botao = form.querySelector("button[type=submit]");
  if (botao instanceof HTMLButtonElement) botao.disabled = true;
  try {
    if (!supabaseConfigurado()) {
      const mensagem = `Olá! Sou ${registro.nome}${registro.empresa ? `, da ${registro.empresa}` : ""}. Interesse: ${registro.interesse ?? "contato"}. ${registro.mensagem ?? ""}`;
      window.open(
        `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensagem)}`,
        "_blank",
        "noopener",
      );
      mostrar("Abrimos o WhatsApp com a sua mensagem pronta.");
      return;
    }
    const { error } = await db().from("contatos_site").insert(registro);
    if (error) throw error;
    form.reset();
    mostrar(
      `Obrigado, ${registro.nome.split(" ")[0]}! Recebemos o seu contato e respondemos em até um dia útil.`,
    );
  } catch (erro) {
    mostrar(mensagemDeErro(erro), true);
  } finally {
    if (botao instanceof HTMLButtonElement) botao.disabled = false;
  }
});
