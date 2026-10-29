-- =============================================================================
-- Funções auxiliares e gatilhos.
-- As funções com "security definer" rodam com permissão do dono do banco, então:
--   * ficam no esquema "privado" (fora da API) ou checam a permissão por conta própria;
--   * fixam search_path = '' e usam nomes completos (public.tabela) contra sequestro de esquema.
-- =============================================================================

-- ----------------------------------------------------------- permissões -----
-- A pessoa logada é da equipe da Lócus?
create or replace function privado.eh_equipe()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'equipe' and ativo
  );
$$;

-- A pessoa logada tem acesso a esta empresa?
create or replace function privado.eh_membro(p_empresa uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.empresa_membros m
    join public.perfis p on p.id = m.usuario_id
    where m.empresa_id = p_empresa and m.usuario_id = (select auth.uid()) and p.ativo
  );
$$;

-- Pode ver a empresa: equipe vê todas, cliente vê as suas.
create or replace function privado.pode_ver_empresa(p_empresa uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select privado.eh_equipe() or privado.eh_membro(p_empresa);
$$;

-- Converte texto em uuid sem erro (usada nos caminhos do Storage).
create or replace function privado.uuid_ou_nulo(p_texto text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_texto::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

grant usage on schema privado to anon, authenticated;
grant execute on all functions in schema privado to anon, authenticated;

-- --------------------------------------------------- novo login → perfil -----
create or replace function privado.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, email, nome, trocar_senha)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(left(new.raw_user_meta_data ->> 'nome', 120), ''),
    coalesce((new.raw_user_meta_data ->> 'trocar_senha')::boolean, false)
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
after insert on auth.users
for each row execute function privado.criar_perfil();

-- ------------------------------------------------- chamado: data e avisos -----
create or replace function privado.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger chamados_atualizado_em
before update on public.chamados
for each row execute function privado.tocar_atualizado_em();

-- Mensagem nova: atualiza o chamado e, se foi a equipe que respondeu, avisa o cliente.
create or replace function privado.ao_criar_mensagem()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chamado public.chamados%rowtype;
  v_da_equipe boolean;
begin
  select * into v_chamado from public.chamados where id = new.chamado_id;
  select papel = 'equipe' into v_da_equipe from public.perfis where id = new.autor_id;

  update public.chamados
  set atualizado_em = now(),
      status = case
        when coalesce(v_da_equipe, false) and status = 'aberto' then 'em_atendimento'::public.status_chamado
        else status
      end
  where id = new.chamado_id;

  if coalesce(v_da_equipe, false) then
    insert into public.avisos (empresa_id, titulo, corpo, destino)
    values (
      v_chamado.empresa_id,
      'Resposta da Lócus: ' || v_chamado.assunto,
      left(new.texto, 200),
      'chamados/' || v_chamado.id
    );
  end if;
  return new;
end;
$$;

create trigger chamado_mensagens_ao_criar
after insert on public.chamado_mensagens
for each row execute function privado.ao_criar_mensagem();

-- ----------------------------------------------- guia ou entrega → aviso -----
create or replace function privado.avisar_guia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.avisos (empresa_id, titulo, corpo, destino)
  values (
    new.empresa_id,
    'Nova guia: ' || new.tipo,
    'Vence em ' || to_char(new.vencimento, 'DD/MM/YYYY') || '.',
    'guias/' || new.id
  );
  return new;
end;
$$;

create trigger guias_avisar
after insert on public.guias
for each row execute function privado.avisar_guia();

create or replace function privado.avisar_entrega()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.avisos (empresa_id, titulo, corpo, destino)
  values (
    new.empresa_id,
    case when new.categoria = 'diagnostico' then 'Painel atualizado' else 'Novo documento da Lócus' end,
    new.titulo,
    case when new.categoria = 'diagnostico' then 'painel' else 'arquivo' end
  );
  return new;
end;
$$;

create trigger entregas_avisar
after insert on public.entregas
for each row execute function privado.avisar_entrega();

-- ------------------------------------------- guia paga (ação do cliente) -----
-- O cliente pode marcar uma guia como paga, mas não pode mudar valor ou vencimento.
-- Por isso a mudança passa por esta função, e não por update direto na tabela.
create or replace function public.marcar_guia_paga(p_guia uuid, p_paga boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid;
begin
  select empresa_id into v_empresa from public.guias where id = p_guia;
  if v_empresa is null or not privado.pode_ver_empresa(v_empresa) then
    raise exception 'Guia não encontrada.' using errcode = 'P0002';
  end if;

  update public.guias
  set status = case when p_paga then 'paga'::public.status_guia else 'a_pagar'::public.status_guia end,
      pago_em = case when p_paga then now() else null end
  where id = p_guia and status <> 'cancelada';
end;
$$;

revoke execute on function public.marcar_guia_paga(uuid, boolean) from public, anon;
grant execute on function public.marcar_guia_paga(uuid, boolean) to authenticated;

-- ------------------------------------------- troca de senha provisória -----
-- Depois que a pessoa troca a senha provisória no app, o aviso de troca some.
create or replace function public.senha_trocada()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.perfis set trocar_senha = false where id = (select auth.uid());
$$;

revoke execute on function public.senha_trocada() from public, anon;
grant execute on function public.senha_trocada() to authenticated;
