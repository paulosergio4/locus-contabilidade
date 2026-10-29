# Testes

| Pasta      | Como rodar                                | O que confere                                              |
| ---------- | ----------------------------------------- | ---------------------------------------------------------- |
| `unidade/` | `npm test`                                | Formatos (dinheiro, datas, CNPJ, CPF) e o HTML seguro      |
| `banco/`   | `npm run test:banco`                      | Migrações e regras de acesso: cada papel só faz o que pode |
| `visual/`  | `node testes/visual/telas.mjs /tmp/telas` | Abre todas as telas com dados de exemplo e tira fotos      |

Regra: toda regra fiscal ou de cálculo nova entra com um teste de caso conferido à mão.
