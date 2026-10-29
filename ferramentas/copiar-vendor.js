// Copia as bibliotecas de terceiros do node_modules para web/compartilhado/vendor.
// Assim o site não depende de CDN e o app funciona sem internet depois da primeira visita.
// Rode `npm run vendor` sempre que atualizar a versão de uma delas no package.json.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "web/compartilhado/vendor");
mkdirSync(destino, { recursive: true });

const bibliotecas = [
  {
    pacote: "@supabase/supabase-js",
    origem: "dist/umd/supabase.js",
    arquivo: "supabase.js",
  },
];

for (const { pacote, origem, arquivo } of bibliotecas) {
  const pasta = join(raiz, "node_modules", pacote);
  const { version } = JSON.parse(readFileSync(join(pasta, "package.json"), "utf8"));
  copyFileSync(join(pasta, origem), join(destino, arquivo));
  console.log(`${pacote}@${version} → web/compartilhado/vendor/${arquivo}`);
}
