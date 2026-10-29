-- =============================================================================
-- Testes das regras de acesso. Cada bloco entra como uma pessoa diferente e confere
-- o que ela pode e o que não pode fazer. Um teste que falha interrompe tudo com a
-- mensagem "FALHOU: ...".
-- Pessoas: E = equipe Lócus · A = cliente da empresa 1 · B = cliente da empresa 2.
-- =============================================================================
\set E '00000000-0000-0000-0000-0000000000e1'
\set A '00000000-0000-0000-0000-0000000000a1'
\set B '00000000-0000-0000-0000-0000000000b1'
\set EMP1 '10000000-0000-0000-0000-000000000001'
\set EMP2 '10000000-0000-0000-0000-000000000002'

-- ----------------------------------------------------------- preparação -----
insert into auth.users (id, email, raw_user_meta_data) values
  (:'E', 'equipe@locus.test', '{"nome": "Equipe"}'),
  (:'A', 'ana@empresa1.test', '{"nome": "Ana", "trocar_senha": true}'),
  (:'B', 'beto@empresa2.test', '{"nome": "Beto"}');

do $$ begin
  if (select count(*) from public.perfis) <> 3 then raise exception 'FALHOU: gatilho não criou os perfis'; end if;
  if not (select trocar_senha from public.perfis where email = 'ana@empresa1.test') then
    raise exception 'FALHOU: trocar_senha não veio do cadastro';
  end if;
end $$;

update public.perfis set papel = 'equipe' where id = :'E';

insert into public.empresas (id, razao_social, documento, regime) values
  (:'EMP1', 'Empresa Um Ltda', '11111111000111', 'simples'),
  (:'EMP2', 'Empresa Dois Ltda', '22222222000122', 'presumido');
insert into public.empresa_membros (empresa_id, usuario_id) values (:'EMP1', :'A'), (:'EMP2', :'B');

insert into public.guias (empresa_id, tipo, competencia, valor_centavos, vencimento, publicado_por) values
  (:'EMP1', 'DAS', '2026-10-01', 405012, '2026-11-20', :'E'),
  (:'EMP2', 'DAS', '2026-10-01', 100000, '2026-11-20', :'E');
insert into public.prazos (empresa_id, titulo, vencimento) values (:'EMP1', 'DCTFWeb', '2026-11-14');

do $$ begin
  if (select count(*) from public.avisos) <> 2 then raise exception 'FALHOU: guia nova não gerou aviso'; end if;
end $$;

-- ------------------------------------------------------------ cliente A -----
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'A', true);

do $$ begin
  if (select count(*) from public.empresas) <> 1 then raise exception 'FALHOU: cliente vê empresa de outro'; end if;
  if (select count(*) from public.guias) <> 1 then raise exception 'FALHOU: cliente vê guia de outro'; end if;
  if (select count(*) from public.avisos) <> 1 then raise exception 'FALHOU: cliente vê aviso de outro'; end if;
  if (select count(*) from public.prazos) <> 0 then raise exception 'FALHOU: cliente vê prazos internos'; end if;
  if (select count(*) from public.perfis) <> 2 then raise exception 'FALHOU: cliente deveria ver a si e a equipe'; end if;
end $$;

-- Não publica guia.
do $$ begin
  begin
    insert into public.guias (empresa_id, tipo, competencia, valor_centavos, vencimento)
    values ('10000000-0000-0000-0000-000000000001', 'DAS', '2026-11-01', 1, '2026-12-20');
    raise exception 'FALHOU: cliente publicou guia';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Não vira equipe.
do $$ begin
  begin
    update public.perfis set papel = 'equipe' where id = auth.uid();
    raise exception 'FALHOU: cliente mudou o próprio papel';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Muda o próprio nome.
update public.perfis set nome = 'Ana Souza' where id = auth.uid();

-- Envia documento só para a própria empresa.
insert into public.documentos (empresa_id, categoria, caminho, nome_arquivo)
values (:'EMP1', 'extrato', :'EMP1' || '/documentos/extrato.pdf', 'extrato.pdf');
do $$ begin
  begin
    insert into public.documentos (empresa_id, categoria, caminho, nome_arquivo)
    values ('10000000-0000-0000-0000-000000000002', 'extrato', 'x/documentos/y.pdf', 'y.pdf');
    raise exception 'FALHOU: cliente enviou documento para empresa de outro';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Marca a própria guia como paga, e não a de outro.
select public.marcar_guia_paga((select id from public.guias limit 1));
do $$ begin
  if (select status from public.guias limit 1) <> 'paga' then raise exception 'FALHOU: guia não ficou paga'; end if;
  begin
    perform public.marcar_guia_paga(
      (select id from public.guias where false)
    );
    raise exception 'FALHOU: aceitou guia inexistente';
  exception when sqlstate 'P0002' then null;
  end;
end $$;

-- Abre chamado e escreve.
insert into public.chamados (id, empresa_id, categoria, assunto, dados)
values ('20000000-0000-0000-0000-000000000001', :'EMP1', 'ferias', 'Férias do João', '{"dias": 30}');
insert into public.chamado_mensagens (chamado_id, texto)
values ('20000000-0000-0000-0000-000000000001', 'Pode programar para dezembro?');

-- Não pode mudar o status do chamado.
do $$ begin
  update public.chamados set status = 'resolvido';
  if exists (select 1 from public.chamados where status = 'resolvido') then
    raise exception 'FALHOU: cliente mudou status do chamado';
  end if;
end $$;

-- Arquivos: só na pasta documentos da própria empresa.
insert into storage.objects (bucket_id, name) values ('arquivos', :'EMP1' || '/documentos/a.pdf');
do $$ begin
  begin
    insert into storage.objects (bucket_id, name) values ('arquivos', '10000000-0000-0000-0000-000000000001/guias/a.pdf');
    raise exception 'FALHOU: cliente gravou na pasta guias';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('arquivos', '10000000-0000-0000-0000-000000000002/documentos/a.pdf');
    raise exception 'FALHOU: cliente gravou arquivo de outra empresa';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('arquivos', 'qualquer-coisa/documentos/a.pdf');
    raise exception 'FALHOU: aceitou caminho sem empresa';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

-- ------------------------------------------------------------ cliente B -----
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'B', true);
do $$ begin
  if (select count(*) from public.documentos) <> 0 then raise exception 'FALHOU: B vê documentos de A'; end if;
  if (select count(*) from public.chamados) <> 0 then raise exception 'FALHOU: B vê chamados de A'; end if;
  if (select count(*) from public.chamado_mensagens) <> 0 then raise exception 'FALHOU: B vê mensagens de A'; end if;
  if (select count(*) from storage.objects) <> 0 then raise exception 'FALHOU: B vê arquivos de A'; end if;
  if (select count(*) from public.perfis where nome = 'Ana Souza') <> 0 then raise exception 'FALHOU: B vê perfil de A'; end if;
end $$;
do $$ begin
  begin
    insert into public.chamado_mensagens (chamado_id, texto) values ('20000000-0000-0000-0000-000000000001', 'oi');
    raise exception 'FALHOU: B escreveu no chamado de A';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

-- --------------------------------------------------------------- equipe -----
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'E', true);
do $$ begin
  if (select count(*) from public.empresas) <> 2 then raise exception 'FALHOU: equipe não vê todas as empresas'; end if;
  if (select count(*) from public.prazos) <> 1 then raise exception 'FALHOU: equipe não vê prazos'; end if;
  if (select count(*) from public.documentos) <> 1 then raise exception 'FALHOU: equipe não vê documentos'; end if;
end $$;
insert into public.chamado_mensagens (chamado_id, texto)
values ('20000000-0000-0000-0000-000000000001', 'Pode sim, já estamos preparando.');
do $$ begin
  if (select status from public.chamados) <> 'em_atendimento' then
    raise exception 'FALHOU: resposta da equipe não mudou o status';
  end if;
  if not exists (select 1 from public.avisos where destino like 'chamados/%') then
    raise exception 'FALHOU: resposta da equipe não avisou o cliente';
  end if;
end $$;
insert into storage.objects (bucket_id, name) values ('arquivos', :'EMP1' || '/guias/das.pdf');
update public.documentos set status = 'processado';
commit;

-- ------------------------------------------------------------ visitante -----
begin;
set local role anon;
insert into public.contatos_site (nome, telefone, interesse, consentimento) values ('Maria', '37999990000', 'Diagnóstico gratuito', true);
do $$ begin
  begin
    perform 1 from public.contatos_site;
    raise exception 'FALHOU: visitante leu contatos';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.contatos_site (nome, telefone, consentimento) values ('Sem consentimento', '1', false);
    raise exception 'FALHOU: aceitou contato sem consentimento';
  exception when check_violation then null;
  end;
  begin
    perform 1 from public.empresas;
    raise exception 'FALHOU: visitante leu empresas';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

\echo 'Testes de acesso: tudo certo.'
