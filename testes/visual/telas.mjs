// Abre o app com o Supabase de mentira e tira fotos das telas, no celular e no computador.
// Uso: node testes/visual/telas.mjs  (serve a pasta web/ numa porta local)
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

// O Playwright fica instalado fora do projeto; o require comum o encontra.
const { chromium } = createRequire(import.meta.url)("playwright");

const raiz = new URL("../../web/", import.meta.url).pathname;
const falso = await readFile(new URL("./supabase-falso.js", import.meta.url), "utf8");
const tipos = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".webmanifest": "application/json",
  ".svg": "image/svg+xml",
};
const servidor = createServer(async (req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (caminho.endsWith("/compartilhado/vendor/supabase.js")) {
    res.writeHead(200, { "content-type": "text/javascript" });
    return res.end(falso);
  }
  if (caminho.endsWith("/compartilhado/js/config.js")) {
    res.writeHead(200, { "content-type": "text/javascript" });
    return res.end(
      `export const CONFIG = Object.freeze({ supabaseUrl: "http://falso", supabaseChave: "falso", urlApp: "http://localhost/app/", whatsapp: "5537000000000" });\nexport function supabaseConfigurado() { return true; }`,
    );
  }
  try {
    const arquivo = join(raiz, caminho.endsWith("/") ? caminho + "index.html" : caminho);
    const corpo = await readFile(arquivo);
    res.writeHead(200, { "content-type": tipos[extname(arquivo)] ?? "application/octet-stream" });
    res.end(corpo);
  } catch {
    res.writeHead(404);
    res.end("não achei");
  }
});
await new Promise((ok) => servidor.listen(8765, ok));

const saida = process.argv[2] ?? "/tmp/telas";
const navegador = await chromium.launch();
const erros = [];
const cenarios = [
  [
    "cliente",
    [
      "inicio",
      "guias",
      "enviar",
      "painel",
      "chamados",
      "chamados/20000000-0000-0000-0000-000000000001",
      "arquivo",
      "perfil",
    ],
  ],
  [
    "equipe",
    [
      "clientes",
      "clientes/10000000-0000-0000-0000-000000000001",
      "entrada",
      "publicar",
      "chamados",
      "prazos",
      "contatos",
    ],
  ],
];
for (const [papel, telas] of cenarios) {
  for (const [nome, viewport] of [
    ["celular", { width: 390, height: 844 }],
    ["computador", { width: 1366, height: 860 }],
  ]) {
    const pagina = await navegador.newPage({ viewport });
    pagina.on("pageerror", (e) => erros.push(`${papel}/${nome}: ${e.message}`));
    pagina.on("console", (m) => m.type() === "error" && erros.push(`${papel}/${nome} console: ${m.text()}`));
    for (const tela of telas) {
      await pagina.goto(`http://localhost:8765/app/?papel=${papel}#/${tela}`);
      await pagina.waitForTimeout(700);
      const texto = await pagina.locator("#view").innerText();
      if (/Não deu para abrir/.test(texto)) erros.push(`${papel}/${tela}: ${texto.slice(0, 200)}`);
      await pagina.screenshot({
        path: `${saida}/${papel}-${nome}-${tela.replaceAll("/", "_").slice(0, 30)}.png`,
        fullPage: nome === "celular",
      });
    }
    await pagina.close();
  }
}
await navegador.close();
servidor.close();
console.log(erros.length ? `Problemas:\n${erros.join("\n")}` : "Todas as telas abriram sem erro.");
