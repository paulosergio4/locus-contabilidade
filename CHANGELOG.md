# Histórico de versões

Formato: o que mudou, do mais novo para o mais antigo. Versões seguem `maior.menor.correção`.

## 0.2.0 · 16/11/2026

Identidade visual "Natural e neutra" em todo o sistema.

- Logo novo: L de eixos fino com o ponto cobre, no site, no app, no painel, nos ícones do app e no favicon.
- Cores: bege e linho de base, verde-sálvia nos destaques, cinza quente nos textos de apoio, cobre só no ponto.
  Os temas claro e escuro foram ajustados para a nova paleta.
- Fonte Mulish servida pelo próprio site (`web/compartilhado/fontes/`), sem Google Fonts: abre sem internet no
  app e não envia o endereço de quem visita para terceiros.
- Imagens da marca em `web/marca/` (usadas, por exemplo, na assinatura de e-mail).
- App: `VERSAO` do service worker passou para `locus-app-v2`, para os aparelhos baixarem o visual novo.
- Painel: os cartões do topo não mostram mais os números de exemplo depois de abrir a planilha.

## 0.1.0 · 29/10/2026

Primeira versão do projeto Lócus Contabilidade separado do repositório `meus-projetos`.

- Banco no Supabase: tabelas do escritório, regras de acesso, armazenamento privado e gatilhos de aviso, com testes.
- App de verdade para cliente e equipe, instalável no celular e no computador.
- Cliente: início com avisos, guias com código e PIX, envio de documentos, painel, pedidos e conversa, arquivo e perfil.
- Equipe: carteira de clientes, acesso por senha provisória, entrada de documentos, publicação de guias e
  relatórios, chamados, prazos e contatos do site.
- Site: formulário de contato gravando no banco, com consentimento e aviso de privacidade.
- Painel: abre direto a planilha publicada para o cliente.
- Padrões: ESLint, Stylelint, Prettier, checagem de tipos, testes e GitHub Actions.
