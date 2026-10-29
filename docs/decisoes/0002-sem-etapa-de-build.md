# 0002 · HTML, CSS e JavaScript sem etapa de build

**Data:** 29/10/2026 · **Situação:** aceita

## Decisão

As páginas são arquivos estáticos publicados como estão. O JavaScript usa módulos nativos do navegador
(`type="module"`) e a checagem de tipos é feita pelo TypeScript lendo os comentários JSDoc
(`npm run tipos`), sem gerar arquivos.

## Por quê

- Qualquer dev abre e entende o código sem aprender uma ferramenta de build.
- O GitHub Pages publica direto a pasta `web/`.
- A checagem de tipos pega erros como se fosse TypeScript.

## Quando rever

Se o app crescer muito (dezenas de telas) ou precisar de bibliotecas grandes, avaliar Vite + TypeScript.
