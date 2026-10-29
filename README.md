# Lócus Contabilidade

Sistemas do escritório digital da Lócus Contabilidade Estratégica: site, painel de diagnóstico, app do
cliente e área da equipe. Este é o **projeto Lócus Contabilidade**. Os sistemas grandes (Lócus Nota,
Ponto, Gestão e Sistema Contábil) ficam no projeto Ecossistema Lócus, para depois da abertura.

## O que tem aqui

| Parte                | Endereço            | O que faz                                                                                                |
| -------------------- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| Site                 | `/`                 | Apresenta a Lócus, simulador tributário e formulário de contato                                          |
| App                  | `/app/`             | Um app só para clientes e equipe; as telas mudam conforme o login. Instalável no celular e no computador |
| Painel               | `/painel/`          | Diagnóstico financeiro a partir da planilha de lançamentos                                               |
| Aviso de privacidade | `/privacidade.html` | Texto da LGPD para o site e o app                                                                        |

Tecnologias: HTML, CSS e JavaScript sem etapa de build, publicados no GitHub Pages, com banco,
login e arquivos no [Supabase](https://supabase.com) (PostgreSQL).

## Rodar em 10 minutos

Precisa de Node.js 22 ou mais novo.

```bash
npm install          # ferramentas de verificação
npm run servir       # abre o site em http://localhost:8080
```

Sem o Supabase configurado, o app mostra a tela "quase pronto". Para ligar, preencha
`web/compartilhado/js/config.js` com a URL e a chave publicável do projeto (veja
[docs/guia-rapido.md](docs/guia-rapido.md)).

## Antes de enviar qualquer mudança

```bash
npm run verificar    # estilo (ESLint, Stylelint, Prettier), tipos e testes
npm run test:banco   # migrações e regras de acesso num Postgres local
npm run formatar     # corrige a formatação sozinho
```

O GitHub roda as mesmas verificações a cada envio (`.github/workflows/verificar.yml`).

## Pastas

```text
web/                    tudo o que é publicado
├── index.html, css/, js/   site
├── app/                    app do cliente e da equipe (PWA)
│   ├── js/main.js          ponto de partida
│   ├── js/navegacao.js     rotas (#/guias, #/chamados/<id>)
│   └── js/telas/           uma tela por arquivo
├── painel/                 painel de diagnóstico
└── compartilhado/          código usado por todas as páginas
    ├── js/                 Supabase, login, arquivos, formatos, HTML seguro
    └── vendor/             bibliotecas de terceiros (não editar à mão)
supabase/
├── migrations/             banco de dados, uma mudança por arquivo numerado
└── functions/              funções que rodam no servidor (convidar-usuario)
testes/
├── unidade/                testes das funções puras (node --test)
├── banco/                  testes das regras de acesso
└── visual/                 fotos das telas com dados de exemplo
docs/                       como funciona e por que foi feito assim
```

## Documentação

- [Guia rápido](docs/guia-rapido.md): configurar, publicar e dar acesso a clientes
- [Arquitetura](docs/arquitetura.md): como as partes conversam
- [Banco de dados](docs/banco.md): tabelas e regras de acesso
- [Decisões](docs/decisoes/): o porquê de cada escolha importante
- [Histórico de versões](CHANGELOG.md)
