// O template html precisa escapar tudo o que vem de fora, para evitar injeção de código.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cru, escapar, html } from "../../web/compartilhado/js/html.js";

test("escapa texto vindo do usuário", () => {
  const nome = '<img src=x onerror="alert(1)">';
  assert.equal(html`<b>${nome}</b>`.valor, "<b>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</b>");
  assert.equal(escapar("a & 'b'"), "a &amp; &#39;b&#39;");
});

test("junta listas e ignora vazios", () => {
  const itens = ["um", "dois"].map((t) => html`<li>${t}</li>`);
  assert.equal(html`<ul>${itens}${null}${false}${undefined}</ul>`.valor, "<ul><li>um</li><li>dois</li></ul>");
});

test("cru mantém HTML confiável", () => {
  assert.equal(html`<p>${cru("<svg></svg>")}</p>`.valor, "<p><svg></svg></p>");
});
