-- =============================================================================
-- Armazenamento de arquivos (Supabase Storage).
-- Um único bucket privado. Caminho de todo arquivo:
--   <id da empresa>/<pasta>/<nome único>
-- pasta = documentos (enviados pelo cliente) | guias | entregas (publicados pela equipe)
-- Ninguém acessa por link público: o app pede um link temporário a cada download.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'arquivos',
  'arquivos',
  false,
  26214400, -- 25 MB
  array[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'text/xml', 'application/xml',
    'text/csv', 'text/plain', 'application/x-ofx',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip', 'application/x-zip-compressed'
  ]
)
on conflict (id) do nothing;

-- Primeiro trecho do caminho = id da empresa; segundo = pasta.
create or replace function privado.empresa_do_caminho(p_caminho text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select privado.uuid_ou_nulo(split_part(p_caminho, '/', 1));
$$;

create or replace function privado.pasta_do_caminho(p_caminho text)
returns text
language sql
immutable
set search_path = ''
as $$
  select split_part(p_caminho, '/', 2);
$$;

grant execute on function privado.empresa_do_caminho(text) to authenticated;
grant execute on function privado.pasta_do_caminho(text) to authenticated;

create policy "arquivos: ver os da própria empresa"
on storage.objects for select to authenticated
using (
  bucket_id = 'arquivos'
  and privado.pode_ver_empresa(privado.empresa_do_caminho(name))
);

-- Cliente só envia na pasta documentos da própria empresa; equipe envia em qualquer pasta.
create policy "arquivos: enviar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'arquivos'
  and privado.empresa_do_caminho(name) is not null
  and privado.pasta_do_caminho(name) in ('documentos', 'guias', 'entregas')
  and (
    (select privado.eh_equipe())
    or (
      privado.eh_membro(privado.empresa_do_caminho(name))
      and privado.pasta_do_caminho(name) = 'documentos'
    )
  )
);

create policy "arquivos: equipe substitui"
on storage.objects for update to authenticated
using (bucket_id = 'arquivos' and (select privado.eh_equipe()))
with check (bucket_id = 'arquivos' and (select privado.eh_equipe()));

create policy "arquivos: equipe apaga"
on storage.objects for delete to authenticated
using (bucket_id = 'arquivos' and (select privado.eh_equipe()));
