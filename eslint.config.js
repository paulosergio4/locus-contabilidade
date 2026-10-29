// Regras de qualidade do JavaScript. Rode `npm run lint` antes de cada commit.
import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/", "web/compartilhado/vendor/", "docs/prototipos/", "supabase/functions/"],
  },
  js.configs.recommended,
  {
    files: ["web/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, supabase: "readonly", XLSX: "readonly" },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    // Scripts antigos do site e do painel, carregados como script comum (não módulo).
    files: ["web/js/main.js", "web/painel/js/main.js"],
    languageOptions: { sourceType: "script" },
    rules: { "no-var": "off" },
  },
  {
    // Supabase de mentira usado no teste visual: roda dentro do navegador.
    files: ["testes/visual/supabase-falso.js"],
    languageOptions: { sourceType: "script", globals: globals.browser },
  },
  {
    files: ["testes/**/*.js", "testes/**/*.mjs", "ferramentas/**/*.js", "*.js"],
    ignores: ["testes/visual/supabase-falso.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.node },
  },
];
