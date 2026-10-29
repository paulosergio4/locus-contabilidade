# Arquitetura

O navegador conversa direto com o Supabase. Não há servidor próprio no meio: quem protege os dados são
as regras de acesso do banco (Row Level Security), que valem para qualquer pedido, venha de onde vier.

```text
Site / App / Painel (GitHub Pages)
        │  chave publicável + login da pessoa
        ▼
Supabase
├── Auth        login, senha, sessão
├── PostgreSQL  tabelas + regras de acesso (RLS) + gatilhos de aviso
├── Storage     bucket privado "arquivos", links temporários
└── Functions   convidar-usuario (usa a chave de serviço, só no servidor)
```

## App

- `main.js` confere a sessão, carrega perfil e empresas e liga a navegação.
- `navegacao.js` lê o endereço (`#/guias/<id>`), escolhe a tela e confere se o papel da pessoa pode abri-la.
  Esconder uma tela no menu é só conforto; a proteção de verdade está no banco.
- Cada arquivo em `telas/` exporta `montar(contexto)` e devolve `{ conteudo, aoMontar }`.
  `conteudo` é HTML seguro; `aoMontar` liga os botões e recebe um `AbortSignal` que desliga tudo ao trocar de tela.
- Todo texto vindo do banco passa pelo `html` de `compartilhado/js/html.js`, que escapa caracteres
  perigosos. Nunca monte HTML juntando texto com `+` ou `innerHTML` direto.
- O `sw.js` guarda os arquivos do app para abrir rápido e sem internet. Ao mudar arquivos do app,
  aumente `VERSAO` no `sw.js`.

## Fluxos principais

| Ação                         | Quem             | Caminho                                                                               |
| ---------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| Dar acesso a um cliente      | Equipe           | Ficha do cliente → função `convidar-usuario` → senha provisória enviada no WhatsApp   |
| Publicar guia                | Equipe           | Publicar → PDF no Storage (`<empresa>/guias/`) → tabela `guias` → gatilho cria aviso  |
| Enviar documento             | Cliente          | Enviar → Storage (`<empresa>/documentos/`) → tabela `documentos` → aparece na Entrada |
| Pedido (férias, admissão...) | Cliente          | Falar → tabela `chamados` → equipe responde → gatilho avisa o cliente                 |
| Painel                       | Equipe e cliente | Equipe publica a planilha "diagnóstico"; cliente abre `/painel/?entrega=<id>`         |
| Contato do site              | Visitante        | Formulário → `contatos_site` (só inserir) → aba Site da equipe                        |
