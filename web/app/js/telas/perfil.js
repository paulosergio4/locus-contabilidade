/**
 * Perfil: dados da pessoa, empresas a que tem acesso, aparência, senha e sair.
 */
import { documentoBR } from "../../../compartilhado/js/formatos.js";
import { html } from "../../../compartilhado/js/html.js";
import { ic } from "../../../compartilhado/js/icones.js";
import { sair, trocarSenha } from "../../../compartilhado/js/sessao.js";
import { db, mensagemDeErro } from "../../../compartilhado/js/supabase.js";
import { aplicarTema, avisar, comCarregando, temaSalvo } from "../../../compartilhado/js/ui.js";
import { campo, lerFormulario, linha, titulo } from "../componentes.js";
import { ehEquipe, empresaAtiva, estado, nomeDaEmpresa } from "../estado.js";
import { REGIME } from "../rotulos.js";

/** @param {import("../navegacao.js").Contexto} _ctx */
export async function montar(_ctx) {
  const perfil = estado.perfil;
  const empresa = empresaAtiva();
  const equipe = ehEquipe();
  const tema = temaSalvo();

  const conteudo = html`${titulo("Perfil", perfil?.email, { rota: equipe ? "clientes" : "inicio", texto: "Voltar" })}
    ${
      !equipe && empresa
        ? html`<div class="sec">Empresa</div>
            <div class="card stack">
              ${linha("Nome", nomeDaEmpresa(empresa))}
              ${linha(empresa.documento.length === 14 ? "CNPJ" : "CPF", documentoBR(empresa.documento))}
              ${linha("Regime", REGIME[empresa.regime])}
            </div>`
        : ""
    }

    <div class="sec">Seus dados</div>
    <form id="form-perfil" class="pd" novalidate>
      ${campo({ nome: "nome", rotulo: "Nome", obrigatorio: true, valor: perfil?.nome, max: 120 })}
      ${campo({ nome: "telefone", rotulo: "WhatsApp", modo: "tel", valor: perfil?.telefone, max: 30 })}
      <button type="submit" class="btn ghost">Salvar dados</button>
    </form>

    <div class="sec">Aparência</div>
    <div class="seg" role="group" aria-label="Aparência do app">
      ${[
        ["auto", "Automático"],
        ["light", "Claro"],
        ["dark", "Escuro"],
      ].map(
        ([k, t]) => html`<button type="button" data-tema="${k}" aria-pressed="${tema === k}">${t}</button>`,
      )}
    </div>

    <div class="sec">Senha</div>
    <form id="form-senha-perfil" class="pd" novalidate>
      ${campo({ nome: "senha", rotulo: "Senha nova", tipo: "password", obrigatorio: true })}
      <button type="submit" class="btn ghost">${ic("lock")}Trocar senha</button>
      <p class="erro-form" role="alert"></p>
    </form>

    <div class="sec">Segurança</div>
    <div class="card stack">
      <div class="seg-row">
        ${ic("shield")}<span><b>Só a sua empresa vê os seus dados</b><small>e a equipe da Lócus</small></span>
      </div>
      <div class="seg-row">
        ${ic("lock")}<span
          ><b>Arquivos protegidos</b><small>os links de download valem por 10 minutos</small></span
        >
      </div>
    </div>
    <div class="sec"></div>
    <button type="button" class="btn ghost" id="sair">${ic("out")}Sair</button>`;

  return {
    conteudo,
    /** @param {HTMLElement} raiz @param {AbortSignal} sinal */
    aoMontar(raiz, sinal) {
      const formPerfil = /** @type {HTMLFormElement} */ (raiz.querySelector("#form-perfil"));
      formPerfil.addEventListener(
        "submit",
        async (e) => {
          e.preventDefault();
          const { nome, telefone } = lerFormulario(formPerfil);
          if (!perfil || nome.length < 2) return avisar("Informe o seu nome.", "erro");
          try {
            await comCarregando(formPerfil.querySelector("button"), async () => {
              const { error } = await db()
                .from("perfis")
                .update({ nome, telefone: telefone || null })
                .eq("id", perfil.id);
              if (error) throw error;
            });
            perfil.nome = nome;
            perfil.telefone = telefone || null;
            avisar("Dados salvos.");
          } catch (x) {
            avisar(mensagemDeErro(x), "erro");
          }
        },
        { signal: sinal },
      );

      const formSenha = /** @type {HTMLFormElement} */ (raiz.querySelector("#form-senha-perfil"));
      formSenha.addEventListener(
        "submit",
        async (e) => {
          e.preventDefault();
          const erro = /** @type {HTMLElement} */ (formSenha.querySelector(".erro-form"));
          const { senha } = lerFormulario(formSenha);
          if (senha.length < 8)
            return void (erro.textContent = "A senha precisa ter pelo menos 8 caracteres.");
          try {
            await comCarregando(formSenha.querySelector("button"), () => trocarSenha(senha));
            formSenha.reset();
            erro.textContent = "";
            avisar("Senha trocada.");
          } catch (x) {
            erro.textContent = mensagemDeErro(x);
          }
        },
        { signal: sinal },
      );
      formSenha.querySelector("input")?.setAttribute("autocomplete", "new-password");

      raiz.addEventListener(
        "click",
        async (e) => {
          const alvo = e.target instanceof Element ? e.target : null;
          const botaoTema = alvo?.closest("[data-tema]");
          if (botaoTema instanceof HTMLElement) {
            const escolhido = /** @type {"auto" | "light" | "dark"} */ (botaoTema.dataset.tema);
            aplicarTema(escolhido);
            raiz
              .querySelectorAll("[data-tema]")
              .forEach((b) => b.setAttribute("aria-pressed", String(b === botaoTema)));
            return;
          }
          if (alvo?.closest("#sair")) await sair();
        },
        { signal: sinal },
      );
    },
  };
}
