/**
 * Equipe · Clientes: carteira de empresas, cadastro de empresa nova e ficha do cliente
 * (quem tem acesso, guias, documentos, pedidos e prazos daquela empresa).
 */
import { CONFIG } from "../../../compartilhado/js/config.js";
import {
  cnpjValido,
  cpfValido,
  dataBR,
  dataHoraBR,
  documentoBR,
  iniciais,
  reais,
  soDigitos,
} from "../../../compartilhado/js/formatos.js";
import { html } from "../../../compartilhado/js/html.js";
import { ic } from "../../../compartilhado/js/icones.js";
import { db, mensagemDeErro } from "../../../compartilhado/js/supabase.js";
import { abrirFolha, avisar, comCarregando, fecharFolha } from "../../../compartilhado/js/ui.js";
import {
  campo,
  conferirObrigatorios,
  copiar,
  item,
  lerFormulario,
  linha,
  pill,
  recarregarTela,
  titulo,
  vazio,
} from "../componentes.js";
import { carregarEmpresas, estado, nomeDaEmpresa, nomeDaEquipe } from "../estado.js";
import { CATEGORIA_DOCUMENTO, REGIME, STATUS_CHAMADO, STATUS_DOCUMENTO, STATUS_GUIA } from "../rotulos.js";

/** @typedef {import("../../../tipos").Empresa} Empresa */

let busca = "";

/** @param {import("../navegacao.js").Contexto} ctx */
export async function montar(ctx) {
  return ctx.parametro ? ficha(ctx.parametro) : carteira();
}

async function carteira() {
  await carregarEmpresas();
  const termo = busca.toLowerCase();
  const empresas = estado.empresas.filter(
    (e) =>
      !termo ||
      nomeDaEmpresa(e).toLowerCase().includes(termo) ||
      e.razao_social.toLowerCase().includes(termo) ||
      e.documento.includes(soDigitos(termo) || "§"),
  );
  const ativas = estado.empresas.filter((e) => e.ativo).length;
  const primeiroNome = (estado.perfil?.nome || "").split(" ")[0];

  return {
    conteudo: html`<div class="hdr">
        <div class="who"><small>Equipe Lócus</small><b>Olá${primeiroNome ? `, ${primeiroNome}` : ""}</b></div>
        <span class="acts"
          ><button type="button" class="av" data-ir="perfil" aria-label="Perfil">
            ${iniciais(estado.perfil?.nome ?? "")}
          </button></span
        >
      </div>
      <div class="grid2">
        <div class="kpi"><small>Clientes ativos</small><b>${ativas}</b></div>
        <div class="kpi"><small>Cadastrados</small><b>${estado.empresas.length}</b></div>
      </div>
      <div class="sec">Carteira</div>
      <div class="field busca">
        <label for="busca-cliente" class="sr-only">Buscar cliente</label>
        <input id="busca-cliente" type="search" placeholder="Buscar por nome, CNPJ ou CPF" value="${busca}" />
      </div>
      <button type="button" class="btn" id="nova-empresa">${ic("plus")}Cadastrar empresa</button>
      <div class="sec"></div>
      <div class="grid-lista">
        ${
          empresas.length
            ? empresas.map((e) =>
                item({
                  icone: "users",
                  titulo: nomeDaEmpresa(e),
                  detalhe: `${REGIME[e.regime]} · ${documentoBR(e.documento)}`,
                  direita: e.ativo ? "" : pill(["Inativa", "bad"]),
                  ir: `clientes/${e.id}`,
                }),
              )
            : vazio(busca ? "Nenhum cliente com esse nome." : "Cadastre o primeiro cliente da Lócus.")
        }
      </div>`,
    /** @param {HTMLElement} raiz @param {AbortSignal} sinal */
    aoMontar(raiz, sinal) {
      let espera = 0;
      raiz.querySelector("#busca-cliente")?.addEventListener(
        "input",
        (e) => {
          busca = /** @type {HTMLInputElement} */ (e.target).value;
          clearTimeout(espera);
          espera = window.setTimeout(() => {
            recarregarTela();
            requestAnimationFrame(() => {
              const campoBusca = /** @type {HTMLInputElement | null} */ (
                document.getElementById("busca-cliente")
              );
              campoBusca?.focus();
              campoBusca?.setSelectionRange(busca.length, busca.length);
            });
          }, 300);
        },
        { signal: sinal },
      );
      raiz
        .querySelector("#nova-empresa")
        ?.addEventListener("click", () => formularioEmpresa(), { signal: sinal });
    },
  };
}

/**
 * Cadastro ou edição de empresa.
 * @param {Empresa} [empresa]
 */
function formularioEmpresa(empresa) {
  abrirFolha(
    html`<h2 class="t">${empresa ? "Editar empresa" : "Cadastrar empresa"}</h2>
      <form id="form-empresa" class="pd" novalidate>
        ${campo({ nome: "razao_social", rotulo: "Razão social ou nome", obrigatorio: true, valor: empresa?.razao_social, max: 200 })}
        ${campo({ nome: "nome_fantasia", rotulo: "Nome fantasia", valor: empresa?.nome_fantasia, max: 200 })}
        ${campo({ nome: "documento", rotulo: "CNPJ ou CPF", obrigatorio: true, modo: "numeric", valor: empresa ? documentoBR(empresa.documento) : "", max: 18 })}
        ${campo({ nome: "regime", rotulo: "Regime", tipo: "select", obrigatorio: true, valor: empresa?.regime ?? "simples", opcoes: Object.entries(REGIME) })}
        ${campo({
          nome: "responsavel_id",
          rotulo: "Responsável na Lócus",
          tipo: "select",
          obrigatorio: true,
          valor: empresa?.responsavel_id ?? estado.perfil?.id,
          opcoes: estado.equipe.map((p) => /** @type {[string, string]} */ ([p.id, p.nome || p.email])),
        })}
        ${
          empresa
            ? campo({
                nome: "ativo",
                rotulo: "Situação",
                tipo: "select",
                obrigatorio: true,
                valor: String(empresa.ativo),
                opcoes: [
                  ["true", "Ativa"],
                  ["false", "Inativa"],
                ],
              })
            : ""
        }
        <button type="submit" class="btn">Salvar</button>
        <p class="erro-form" role="alert"></p>
      </form>`,
  );
  const form = /** @type {HTMLFormElement} */ (document.getElementById("form-empresa"));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const erro = /** @type {HTMLElement} */ (form.querySelector(".erro-form"));
    const falta = conferirObrigatorios(form);
    if (falta) return void (erro.textContent = falta);
    const d = lerFormulario(form);
    const documento = soDigitos(d.documento);
    if (!(documento.length === 14 ? cnpjValido(documento) : cpfValido(documento))) {
      return void (erro.textContent = "CNPJ ou CPF inválido. Confira os números.");
    }
    const registro = {
      razao_social: d.razao_social,
      nome_fantasia: d.nome_fantasia || null,
      documento,
      regime: d.regime,
      responsavel_id: d.responsavel_id || null,
      ...(empresa ? { ativo: d.ativo === "true" } : {}),
    };
    try {
      const id = await comCarregando(form.querySelector("button"), async () => {
        const consulta = empresa
          ? db().from("empresas").update(registro).eq("id", empresa.id).select("id").single()
          : db().from("empresas").insert(registro).select("id").single();
        const { data, error } = await consulta;
        if (error) throw error;
        return data.id;
      });
      fecharFolha();
      avisar("Empresa salva.");
      await carregarEmpresas();
      if (location.hash === `#/clientes/${id}`) recarregarTela();
      else location.hash = `#/clientes/${id}`;
    } catch (x) {
      erro.textContent = mensagemDeErro(x);
    }
  });
}

/** @param {string} id */
async function ficha(id) {
  const [empresaR, membrosR, guiasR, docsR, chamadosR, prazosR] = await Promise.all([
    db().from("empresas").select("*").eq("id", id).maybeSingle(),
    db()
      .from("empresa_membros")
      .select("usuario_id, funcao, perfis(nome, email, telefone, trocar_senha)")
      .eq("empresa_id", id),
    db()
      .from("guias")
      .select("id, tipo, vencimento, valor_centavos, status")
      .eq("empresa_id", id)
      .order("vencimento", { ascending: false })
      .limit(6),
    db()
      .from("documentos")
      .select("id, nome_arquivo, categoria, status, criado_em")
      .eq("empresa_id", id)
      .order("criado_em", { ascending: false })
      .limit(6),
    db()
      .from("chamados")
      .select("id, assunto, status, atualizado_em")
      .eq("empresa_id", id)
      .order("atualizado_em", { ascending: false })
      .limit(6),
    db()
      .from("prazos")
      .select("id, titulo, vencimento, status")
      .eq("empresa_id", id)
      .eq("status", "pendente")
      .order("vencimento")
      .limit(6),
  ]);
  for (const r of [empresaR, membrosR, guiasR, docsR, chamadosR, prazosR]) if (r.error) throw r.error;
  /** @type {Empresa | null} */
  const empresa = empresaR.data;
  const voltar = { rota: "clientes", texto: "Clientes" };
  if (!empresa) return { conteudo: titulo("Cliente não encontrado", "", voltar) };

  /** @type {Array<{ usuario_id: string, funcao: string, perfis: { nome: string, email: string, telefone: string | null, trocar_senha: boolean } | null }>} */
  const membros = /** @type {any} */ (membrosR.data) ?? [];

  const conteudo = html`${titulo(nomeDaEmpresa(empresa), `${REGIME[empresa.regime]} · ${documentoBR(empresa.documento)}`, voltar)}
    <div class="card stack">
      ${linha("Razão social", empresa.razao_social)}
      ${linha("Responsável", nomeDaEquipe(empresa.responsavel_id))}
      ${linha("Situação", empresa.ativo ? "Ativa" : "Inativa")}
    </div>
    <div class="grid2">
      <button type="button" class="btn ghost" id="editar">Editar dados</button>
      <a class="btn ghost" href="#/publicar/${empresa.id}">${ic("up")}Publicar</a>
    </div>

    <div class="sec">Quem tem acesso ao app</div>
    <div class="stack">
      ${
        membros.length
          ? membros.map((m) =>
              item({
                icone: "pessoa",
                titulo: m.perfis?.nome || m.perfis?.email || "",
                detalhe: `${m.perfis?.email ?? ""} · ${m.funcao === "socio" ? "dono ou sócio" : "funcionário"}`,
                direita: m.perfis?.trocar_senha ? pill(["Ainda não entrou", "due"]) : pill(["Ativo", "ok"]),
              }),
            )
          : vazio("Ninguém desta empresa tem acesso ainda.")
      }
    </div>
    <button type="button" class="btn" id="dar-acesso">${ic("plus")}Dar acesso ao app</button>

    <div class="sec">Guias</div>
    <div class="stack">
      ${
        (guiasR.data ?? []).length
          ? (guiasR.data ?? []).map((g) =>
              item({
                icone: "guia",
                titulo: g.tipo,
                detalhe: `vence ${dataBR(g.vencimento)}`,
                direita: html`${reais(g.valor_centavos)}<br />${pill(STATUS_GUIA[g.status])}`,
                ir: `guias/${g.id}`,
              }),
            )
          : vazio("Nenhuma guia publicada.")
      }
    </div>

    <div class="sec">Documentos recebidos</div>
    <div class="stack">
      ${
        (docsR.data ?? []).length
          ? (docsR.data ?? []).map((d) =>
              item({
                icone: "file",
                titulo: d.nome_arquivo,
                detalhe: `${CATEGORIA_DOCUMENTO[d.categoria]} · ${dataHoraBR(d.criado_em)}`,
                direita: pill(STATUS_DOCUMENTO[d.status]),
                ir: "entrada",
              }),
            )
          : vazio("Nenhum documento enviado.")
      }
    </div>

    <div class="sec">Pedidos</div>
    <div class="stack">
      ${
        (chamadosR.data ?? []).length
          ? (chamadosR.data ?? []).map((c) =>
              item({
                icone: "chat",
                titulo: c.assunto,
                detalhe: dataHoraBR(c.atualizado_em),
                direita: pill(STATUS_CHAMADO[c.status]),
                ir: `chamados/${c.id}`,
              }),
            )
          : vazio("Nenhum pedido.")
      }
    </div>

    <div class="sec">Prazos pendentes</div>
    <div class="stack">
      ${
        (prazosR.data ?? []).length
          ? (prazosR.data ?? []).map((p) =>
              item({
                icone: "cal",
                titulo: p.titulo,
                detalhe: `vence ${dataBR(p.vencimento)}`,
                ir: "prazos",
              }),
            )
          : vazio("Nenhum prazo pendente.")
      }
    </div>`;

  return {
    conteudo,
    /** @param {HTMLElement} raiz @param {AbortSignal} sinal */
    aoMontar(raiz, sinal) {
      raiz
        .querySelector("#editar")
        ?.addEventListener("click", () => formularioEmpresa(empresa), { signal: sinal });
      raiz
        .querySelector("#dar-acesso")
        ?.addEventListener("click", () => formularioAcesso(empresa), { signal: sinal });
    },
  };
}

/**
 * Cria o login de alguém do cliente pela função convidar-usuario.
 * @param {Empresa} empresa
 */
function formularioAcesso(empresa) {
  abrirFolha(
    html`<h2 class="t">Dar acesso ao app</h2>
      <p class="s">
        ${nomeDaEmpresa(empresa)}. A pessoa recebe uma senha provisória e escolhe a dela no primeiro acesso.
      </p>
      <form id="form-acesso" class="pd" novalidate>
        ${campo({ nome: "nome", rotulo: "Nome", obrigatorio: true, max: 120 })}
        ${campo({ nome: "email", rotulo: "E-mail", tipo: "email", obrigatorio: true, modo: "email", max: 200 })}
        ${campo({ nome: "telefone", rotulo: "WhatsApp", modo: "tel", max: 30, dica: "(37) 9 0000-0000" })}
        ${campo({
          nome: "funcao",
          rotulo: "Quem é",
          tipo: "select",
          obrigatorio: true,
          opcoes: [
            ["socio", "Dono ou sócio"],
            ["funcionario", "Funcionário"],
          ],
        })}
        <button type="submit" class="btn">Criar acesso</button>
        <p class="erro-form" role="alert"></p>
      </form>`,
  );
  const form = /** @type {HTMLFormElement} */ (document.getElementById("form-acesso"));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const erro = /** @type {HTMLElement} */ (form.querySelector(".erro-form"));
    const falta = conferirObrigatorios(form);
    if (falta) return void (erro.textContent = falta);
    const d = lerFormulario(form);
    try {
      const resposta = await comCarregando(form.querySelector("button"), async () => {
        const { data, error } = await db().functions.invoke("convidar-usuario", {
          body: { ...d, papel: "cliente", empresa_id: empresa.id, modo: "senha" },
        });
        if (error) {
          const corpo = await error.context?.json?.().catch(() => null);
          throw new Error(corpo?.erro ?? error.message);
        }
        return data;
      });
      mostrarAcessoCriado(d, resposta);
      recarregarTela();
    } catch (x) {
      erro.textContent = mensagemDeErro(x);
    }
  });
}

/**
 * Mostra a senha provisória e o texto pronto para o WhatsApp.
 * @param {Record<string, string>} pessoa
 * @param {{ ja_existia: boolean, senha_provisoria?: string }} resposta
 */
function mostrarAcessoCriado(pessoa, resposta) {
  if (resposta.ja_existia || !resposta.senha_provisoria) {
    abrirFolha(
      html`<h2 class="t">Acesso liberado</h2>
        <p class="s">${pessoa.nome} já tinha login no app. Agora também vê esta empresa.</p>
        <button type="button" class="btn" data-fechar-folha>Fechar</button>`,
    );
    return;
  }
  const mensagem = `Olá, ${pessoa.nome.split(" ")[0]}! Seu acesso ao app da Lócus está pronto.\n\nEndereço: ${CONFIG.urlApp}\nE-mail: ${pessoa.email}\nSenha provisória: ${resposta.senha_provisoria}\n\nNo primeiro acesso você escolhe a sua senha. Dá para instalar o app no celular pelo menu do navegador.`;
  const telefone = soDigitos(pessoa.telefone ?? "");
  const linkWhats = telefone
    ? `https://wa.me/55${telefone.replace(/^55/, "")}?text=${encodeURIComponent(mensagem)}`
    : "";
  abrirFolha(
    html`<h2 class="t">Acesso criado</h2>
      <p class="s">Envie para ${pessoa.nome}. Esta senha aparece só agora.</p>
      <div class="senha-box">${resposta.senha_provisoria}</div>
      <div class="sec"></div>
      ${linkWhats ? html`<a class="btn" href="${linkWhats}" target="_blank" rel="noopener">${ic("chat")}Enviar no WhatsApp</a>` : ""}
      <button type="button" class="btn ghost" id="copiar-acesso">${ic("copy")}Copiar mensagem</button>`,
  );
  document.getElementById("copiar-acesso")?.addEventListener("click", async () => {
    avisar((await copiar(mensagem)) ? "Mensagem copiada." : "Não consegui copiar.");
  });
}
