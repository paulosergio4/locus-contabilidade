# Banco de dados

As mudanças ficam em `supabase/migrations/`, numeradas por data. Nunca altere o banco pela tela do Supabase:
crie uma migração nova, rode `npm run test:banco` e aplique.

## Tabelas

| Tabela                           | Guarda                                               | Quem lê                                          | Quem escreve                                                      |
| -------------------------------- | ---------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| `perfis`                         | Uma linha por login: nome, papel (equipe ou cliente) | A própria pessoa, a equipe e quem divide empresa | A própria pessoa (só nome e telefone)                             |
| `empresas`                       | Clientes (CNPJ ou CPF), regime, responsável          | Equipe; cliente vê as suas                       | Equipe                                                            |
| `empresa_membros`                | Quem do cliente acessa cada empresa                  | Equipe e membros                                 | Equipe                                                            |
| `documentos`                     | O que o cliente enviou                               | Equipe e membros                                 | Cliente envia; equipe muda status                                 |
| `guias`                          | Guias com valor em centavos, vencimento, código, PIX | Equipe e membros                                 | Equipe; cliente só marca como paga pela função `marcar_guia_paga` |
| `entregas`                       | Relatórios e documentos da Lócus para o cliente      | Equipe e membros                                 | Equipe                                                            |
| `chamados` e `chamado_mensagens` | Pedidos e conversa                                   | Equipe e membros                                 | Ambos escrevem mensagens; equipe muda status                      |
| `prazos`                         | Agenda interna de obrigações                         | Só equipe                                        | Só equipe                                                         |
| `avisos` e `avisos_lidos`        | Notificações do app                                  | Equipe e membros                                 | Gatilhos; cada pessoa marca as suas como lidas                    |
| `contatos_site`                  | Formulário do site                                   | Só equipe                                        | Qualquer visitante (só inserir)                                   |

## Regras importantes

- Dinheiro sempre em centavos (`bigint`). R$ 4.050,12 = `405012`.
- Competência = primeiro dia do mês (`2026-10-01`).
- Funções com permissão de dono (`security definer`) ficam no esquema `privado`, fixam `search_path`
  e usam nomes completos.
- Exclusão bloqueada (`on delete restrict`) para dados contábeis: errou, corrige ou cancela, não apaga.
- Arquivos: bucket privado `arquivos`, caminho `<id da empresa>/<pasta>/<nome>`. O cliente só grava
  na pasta `documentos` da própria empresa.

## Dar papel de equipe a alguém

Pela área da equipe não é possível (segurança). Rode no SQL do Supabase, trocando o e-mail:

```sql
update public.perfis set papel = 'equipe' where email = 'pessoa@locus.com.br';
```
