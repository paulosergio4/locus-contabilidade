-- =============================================================================
-- Regras de acesso (Row Level Security).
-- Princípio: a equipe da Lócus vê tudo; cada cliente vê só as empresas das quais
-- é membro; visitantes sem login só conseguem enviar o formulário do site.
-- As permissões de tabela (grant) são dadas de forma explícita, sem depender do
-- padrão do projeto, e as regras de linha (policy) decidem o resto.
-- Chamadas como (select privado.eh_equipe()) ficam entre parênteses para o
-- Postgres calcular uma vez por consulta, e não uma vez por linha.
-- =============================================================================

alter table public.perfis enable row level security;
alter table public.empresas enable row level security;
alter table public.empresa_membros enable row level security;
alter table public.documentos enable row level security;
alter table public.guias enable row level security;
alter table public.entregas enable row level security;
alter table public.chamados enable row level security;
alter table public.chamado_mensagens enable row level security;
alter table public.prazos enable row level security;
alter table public.avisos enable row level security;
alter table public.avisos_lidos enable row level security;
alter table public.contatos_site enable row level security;

-- Começa sem nada liberado e libera só o necessário.
revoke all on all tables in schema public from anon, authenticated;

-- --------------------------------------------------------------- perfis -----
grant select on public.perfis to authenticated;
-- Cada pessoa só pode mudar o próprio nome e telefone. Papel e ativo, nunca.
grant update (nome, telefone) on public.perfis to authenticated;

create policy "perfis: ver o próprio, a equipe e quem divide empresa"
on public.perfis for select to authenticated
using (
  id = (select auth.uid())
  or papel = 'equipe'
  or (select privado.eh_equipe())
  or exists (
    select 1
    from public.empresa_membros eu
    join public.empresa_membros outro on outro.empresa_id = eu.empresa_id
    where eu.usuario_id = (select auth.uid()) and outro.usuario_id = perfis.id
  )
);

create policy "perfis: editar o próprio"
on public.perfis for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- ------------------------------------------------------------- empresas -----
grant select, insert, update on public.empresas to authenticated;

create policy "empresas: ver as suas ou todas se for equipe"
on public.empresas for select to authenticated
using ((select privado.eh_equipe()) or (select privado.eh_membro(id)));

create policy "empresas: equipe cadastra"
on public.empresas for insert to authenticated
with check ((select privado.eh_equipe()));

create policy "empresas: equipe edita"
on public.empresas for update to authenticated
using ((select privado.eh_equipe()))
with check ((select privado.eh_equipe()));

-- ------------------------------------------------------ empresa_membros -----
grant select, insert, delete on public.empresa_membros to authenticated;

create policy "membros: ver os da própria empresa"
on public.empresa_membros for select to authenticated
using ((select privado.eh_equipe()) or usuario_id = (select auth.uid()) or (select privado.eh_membro(empresa_id)));

create policy "membros: equipe adiciona"
on public.empresa_membros for insert to authenticated
with check ((select privado.eh_equipe()));

create policy "membros: equipe remove"
on public.empresa_membros for delete to authenticated
using ((select privado.eh_equipe()));

-- ----------------------------------------------------------- documentos -----
grant select, insert, update on public.documentos to authenticated;

create policy "documentos: ver os da própria empresa"
on public.documentos for select to authenticated
using ((select privado.pode_ver_empresa(empresa_id)));

create policy "documentos: cliente envia para a própria empresa"
on public.documentos for insert to authenticated
with check (
  (select privado.pode_ver_empresa(empresa_id))
  and enviado_por = (select auth.uid())
  and status = 'recebido'
);

create policy "documentos: equipe muda o status"
on public.documentos for update to authenticated
using ((select privado.eh_equipe()))
with check ((select privado.eh_equipe()));

-- ---------------------------------------------------------------- guias -----
grant select, insert, update on public.guias to authenticated;

create policy "guias: ver as da própria empresa"
on public.guias for select to authenticated
using ((select privado.pode_ver_empresa(empresa_id)));

create policy "guias: equipe publica"
on public.guias for insert to authenticated
with check ((select privado.eh_equipe()));

-- O cliente marca como paga pela função marcar_guia_paga, não por aqui.
create policy "guias: equipe edita"
on public.guias for update to authenticated
using ((select privado.eh_equipe()))
with check ((select privado.eh_equipe()));

-- ------------------------------------------------------------- entregas -----
grant select, insert, update, delete on public.entregas to authenticated;

create policy "entregas: ver as da própria empresa"
on public.entregas for select to authenticated
using ((select privado.pode_ver_empresa(empresa_id)));

create policy "entregas: equipe publica"
on public.entregas for insert to authenticated
with check ((select privado.eh_equipe()));

create policy "entregas: equipe edita"
on public.entregas for update to authenticated
using ((select privado.eh_equipe()))
with check ((select privado.eh_equipe()));

create policy "entregas: equipe apaga"
on public.entregas for delete to authenticated
using ((select privado.eh_equipe()));

-- ------------------------------------------------------------- chamados -----
grant select, insert, update on public.chamados to authenticated;

create policy "chamados: ver os da própria empresa"
on public.chamados for select to authenticated
using ((select privado.pode_ver_empresa(empresa_id)));

create policy "chamados: cliente abre na própria empresa"
on public.chamados for insert to authenticated
with check (
  (select privado.pode_ver_empresa(empresa_id))
  and aberto_por = (select auth.uid())
  and (status = 'aberto' or (select privado.eh_equipe()))
);

create policy "chamados: equipe atende"
on public.chamados for update to authenticated
using ((select privado.eh_equipe()))
with check ((select privado.eh_equipe()));

-- ---------------------------------------------------- chamado_mensagens -----
grant select, insert on public.chamado_mensagens to authenticated;

create policy "mensagens: ver as dos chamados que pode ver"
on public.chamado_mensagens for select to authenticated
using (
  exists (
    select 1 from public.chamados c
    where c.id = chamado_id and (select privado.pode_ver_empresa(c.empresa_id))
  )
);

create policy "mensagens: escrever nos chamados que pode ver"
on public.chamado_mensagens for insert to authenticated
with check (
  autor_id = (select auth.uid())
  and exists (
    select 1 from public.chamados c
    where c.id = chamado_id and (select privado.pode_ver_empresa(c.empresa_id))
  )
);

-- --------------------------------------------------------------- prazos -----
grant select, insert, update, delete on public.prazos to authenticated;

create policy "prazos: só a equipe"
on public.prazos for all to authenticated
using ((select privado.eh_equipe()))
with check ((select privado.eh_equipe()));

-- --------------------------------------------------------------- avisos -----
grant select, insert on public.avisos to authenticated;

create policy "avisos: ver os da própria empresa"
on public.avisos for select to authenticated
using ((select privado.pode_ver_empresa(empresa_id)));

create policy "avisos: equipe cria aviso manual"
on public.avisos for insert to authenticated
with check ((select privado.eh_equipe()));

grant select, insert, delete on public.avisos_lidos to authenticated;

create policy "avisos lidos: só os próprios"
on public.avisos_lidos for all to authenticated
using (usuario_id = (select auth.uid()))
with check (usuario_id = (select auth.uid()));

-- -------------------------------------------------------- contatos_site -----
-- Visitante só insere. Não há permissão de leitura para anon, então o envio
-- é feito sem pedir a linha de volta.
grant insert on public.contatos_site to anon, authenticated;
grant select, update on public.contatos_site to authenticated;

create policy "contatos: qualquer visitante envia"
on public.contatos_site for insert to anon, authenticated
with check (status = 'novo');

create policy "contatos: equipe lê"
on public.contatos_site for select to authenticated
using ((select privado.eh_equipe()));

create policy "contatos: equipe acompanha"
on public.contatos_site for update to authenticated
using ((select privado.eh_equipe()))
with check ((select privado.eh_equipe()));

-- ---------------------------------------------------------- service_role -----
-- A função convidar-usuario usa a chave de serviço, que ignora as regras de linha,
-- mas ainda precisa de permissão nas tabelas (o projeto não libera tabelas novas sozinho).
grant all on all tables in schema public to service_role;
