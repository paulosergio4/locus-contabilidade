# Supabase

- `migrations/`: o banco inteiro, em ordem. Cada arquivo é uma mudança e nunca é editado depois de aplicado;
  para mudar algo, crie um arquivo novo com data e hora no nome.
- `functions/convidar-usuario/`: cria o login de clientes e da equipe (roda no servidor, com a chave de serviço).

Testar antes de aplicar: `npm run test:banco`. Detalhes em [docs/banco.md](../docs/banco.md).
