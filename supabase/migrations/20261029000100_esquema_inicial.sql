-- =============================================================================
-- Lócus Contabilidade · esquema inicial
-- Tabelas do escritório digital: pessoas, empresas clientes, documentos enviados,
-- guias, entregas da Lócus, chamados, prazos, avisos e contatos do site.
-- Convenções:
--   * nomes em português, no singular para colunas e no plural para tabelas;
--   * dinheiro sempre em centavos (bigint), nunca em ponto flutuante;
--   * competência = primeiro dia do mês a que o documento se refere;
--   * arquivos ficam no Storage; aqui guardamos só o caminho.
-- =============================================================================

-- Funções auxiliares que não devem aparecer na API ficam neste esquema.
create schema if not exists privado;

-- ---------------------------------------------------------------- tipos -----
create type public.papel_usuario as enum ('equipe', 'cliente');
create type public.regime_tributario as enum ('mei', 'simples', 'presumido', 'real', 'pessoa_fisica', 'outro');
create type public.status_documento as enum ('recebido', 'em_analise', 'processado', 'recusado');
create type public.status_guia as enum ('a_pagar', 'paga', 'cancelada');
create type public.status_chamado as enum ('aberto', 'em_atendimento', 'aguardando_cliente', 'resolvido');
create type public.status_prazo as enum ('pendente', 'concluido');
create type public.status_contato as enum ('novo', 'em_contato', 'virou_cliente', 'descartado');

-- -------------------------------------------------------------- perfis -----
-- Um perfil por login do Supabase Auth. Todo novo login nasce como cliente;
-- só um administrador muda alguém para equipe (função convidar-usuario ou SQL).
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '' check (length(nome) <= 120),
  email text not null,
  telefone text check (length(telefone) <= 30),
  papel public.papel_usuario not null default 'cliente',
  ativo boolean not null default true,
  trocar_senha boolean not null default false,
  criado_em timestamptz not null default now()
);
comment on table public.perfis is 'Pessoas com login: equipe da Lócus e clientes.';
comment on column public.perfis.trocar_senha is 'Verdadeiro quando a pessoa recebeu uma senha provisória e precisa trocar no primeiro acesso.';

-- ------------------------------------------------------------ empresas -----
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null check (length(razao_social) between 2 and 200),
  nome_fantasia text check (length(nome_fantasia) <= 200),
  -- CNPJ (14 dígitos) ou CPF (11 dígitos), só números. Pessoa física entra para o IR.
  documento text not null unique check (documento ~ '^([0-9]{11}|[0-9]{14})$'),
  regime public.regime_tributario not null default 'simples',
  responsavel_id uuid references public.perfis (id) on delete set null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
comment on table public.empresas is 'Clientes da Lócus: empresas (CNPJ) ou pessoas físicas (CPF).';
create index empresas_responsavel_idx on public.empresas (responsavel_id);

-- Quem do cliente tem acesso a cada empresa (dono, sócio ou funcionário).
create table public.empresa_membros (
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  funcao text not null default 'socio' check (funcao in ('socio', 'funcionario')),
  criado_em timestamptz not null default now(),
  primary key (empresa_id, usuario_id)
);
create index empresa_membros_usuario_idx on public.empresa_membros (usuario_id);

-- ---------------------------------------------------- documentos enviados -----
-- O que o cliente manda para a Lócus: extratos, notas, contratos, atestados.
create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete restrict,
  enviado_por uuid default auth.uid() references public.perfis (id) on delete set null,
  categoria text not null check (categoria in ('extrato', 'nota_compra', 'nota_venda', 'folha', 'contrato', 'outro')),
  descricao text check (length(descricao) <= 500),
  competencia date check (competencia is null or extract(day from competencia) = 1),
  caminho text not null unique,
  nome_arquivo text not null check (length(nome_arquivo) <= 255),
  tamanho_bytes bigint check (tamanho_bytes >= 0),
  status public.status_documento not null default 'recebido',
  criado_em timestamptz not null default now()
);
create index documentos_empresa_idx on public.documentos (empresa_id, criado_em desc);
create index documentos_enviado_por_idx on public.documentos (enviado_por);

-- ------------------------------------------------------------------ guias -----
create table public.guias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete restrict,
  tipo text not null check (length(tipo) between 2 and 60),
  descricao text check (length(descricao) <= 300),
  competencia date not null check (extract(day from competencia) = 1),
  valor_centavos bigint not null check (valor_centavos >= 0),
  vencimento date not null,
  linha_digitavel text check (length(linha_digitavel) <= 80),
  pix_copia_cola text check (length(pix_copia_cola) <= 600),
  caminho text unique,
  status public.status_guia not null default 'a_pagar',
  pago_em timestamptz,
  publicado_por uuid default auth.uid() references public.perfis (id) on delete set null,
  publicado_em timestamptz not null default now()
);
comment on column public.guias.valor_centavos is 'Valor em centavos: R$ 4.050,12 = 405012.';
create index guias_empresa_idx on public.guias (empresa_id, vencimento desc);
create index guias_publicado_por_idx on public.guias (publicado_por);

-- -------------------------------------------------------------- entregas -----
-- O que a Lócus entrega ao cliente além das guias: painel, balancete, holerites.
create table public.entregas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete restrict,
  categoria text not null check (categoria in ('diagnostico', 'balancete', 'dre', 'folha', 'contrato', 'certidao', 'outro')),
  titulo text not null check (length(titulo) between 2 and 200),
  competencia date check (competencia is null or extract(day from competencia) = 1),
  caminho text not null unique,
  nome_arquivo text not null check (length(nome_arquivo) <= 255),
  publicado_por uuid default auth.uid() references public.perfis (id) on delete set null,
  publicado_em timestamptz not null default now()
);
comment on column public.entregas.categoria is 'diagnostico = planilha lida pelo painel de diagnóstico.';
create index entregas_empresa_idx on public.entregas (empresa_id, publicado_em desc);
create index entregas_publicado_por_idx on public.entregas (publicado_por);

-- -------------------------------------------------------------- chamados -----
create table public.chamados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete restrict,
  aberto_por uuid default auth.uid() references public.perfis (id) on delete set null,
  categoria text not null check (categoria in ('admissao', 'rescisao', 'ferias', 'duvida', 'outro')),
  assunto text not null check (length(assunto) between 2 and 200),
  -- Campos do formulário do pedido (nome do funcionário, datas etc.), como o cliente preencheu.
  dados jsonb not null default '{}'::jsonb check (jsonb_typeof(dados) = 'object'),
  status public.status_chamado not null default 'aberto',
  responsavel_id uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index chamados_empresa_idx on public.chamados (empresa_id, atualizado_em desc);
create index chamados_aberto_por_idx on public.chamados (aberto_por);
create index chamados_responsavel_idx on public.chamados (responsavel_id);

create table public.chamado_mensagens (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references public.chamados (id) on delete cascade,
  autor_id uuid default auth.uid() references public.perfis (id) on delete set null,
  texto text not null check (length(texto) between 1 and 5000),
  criado_em timestamptz not null default now()
);
create index chamado_mensagens_chamado_idx on public.chamado_mensagens (chamado_id, criado_em);
create index chamado_mensagens_autor_idx on public.chamado_mensagens (autor_id);

-- ---------------------------------------------------------------- prazos -----
-- Agenda interna de obrigações da equipe (DCTFWeb, EFD, DAS...). Só a equipe vê.
create table public.prazos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas (id) on delete cascade,
  titulo text not null check (length(titulo) between 2 and 200),
  vencimento date not null,
  status public.status_prazo not null default 'pendente',
  responsavel_id uuid references public.perfis (id) on delete set null,
  concluido_em timestamptz,
  criado_em timestamptz not null default now()
);
create index prazos_vencimento_idx on public.prazos (status, vencimento);
create index prazos_empresa_idx on public.prazos (empresa_id);
create index prazos_responsavel_idx on public.prazos (responsavel_id);

-- ---------------------------------------------------------------- avisos -----
-- Notificações que aparecem no app do cliente. Criadas pelos gatilhos abaixo.
create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  titulo text not null check (length(titulo) between 1 and 200),
  corpo text check (length(corpo) <= 1000),
  -- Tela do app que o aviso abre, por exemplo 'guias' ou 'chamados/<id>'.
  destino text check (length(destino) <= 200),
  criado_em timestamptz not null default now()
);
create index avisos_empresa_idx on public.avisos (empresa_id, criado_em desc);

create table public.avisos_lidos (
  aviso_id uuid not null references public.avisos (id) on delete cascade,
  usuario_id uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  lido_em timestamptz not null default now(),
  primary key (aviso_id, usuario_id)
);
create index avisos_lidos_usuario_idx on public.avisos_lidos (usuario_id);

-- --------------------------------------------------------- contatos do site -----
-- Formulário de contato e pedido de diagnóstico. Qualquer visitante pode enviar;
-- só a equipe lê. O consentimento (LGPD) é obrigatório.
create table public.contatos_site (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(nome) between 2 and 120),
  empresa text check (length(empresa) <= 200),
  telefone text check (length(telefone) <= 30),
  email text check (length(email) <= 200),
  interesse text check (length(interesse) <= 60),
  mensagem text check (length(mensagem) <= 2000),
  origem text not null default 'contato' check (origem in ('contato', 'diagnostico', 'simulador')),
  consentimento boolean not null check (consentimento),
  status public.status_contato not null default 'novo',
  criado_em timestamptz not null default now(),
  check (telefone is not null or email is not null)
);
create index contatos_site_status_idx on public.contatos_site (status, criado_em desc);
