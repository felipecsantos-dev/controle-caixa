-- Esquema do controle de caixa. Pode ser reaplicado sem perder dados.
-- Valores em dinheiro são sempre centavos (integer).

create table if not exists acesso (
  id integer primary key default 1 check (id = 1),
  cnpj text not null,
  senha_hash text not null,
  tentativas integer not null default 0,
  bloqueado_ate timestamptz
);

create table if not exists operadores (
  id serial primary key,
  nome text not null unique,
  ativo boolean not null default true
);

create table if not exists vendedores (
  id serial primary key,
  nome text not null unique,
  ativo boolean not null default true
);

create table if not exists dias (
  data date primary key,
  status text not null default 'aberto' check (status in ('aberto', 'fechado')),
  valor_abertura integer not null check (valor_abertura >= 0),
  aberto_por text not null,
  aberto_em timestamptz not null default now(),
  fechado_por text,
  fechado_em timestamptz,
  dinheiro_esperado integer,
  dinheiro_contado integer,
  diferenca integer,
  motivo_divergencia text
);

create table if not exists vendas (
  id bigint generated always as identity primary key,
  data date not null references dias (data),
  criado_em timestamptz not null default now(),
  valor integer not null check (valor > 0),
  desconto integer not null default 0 check (desconto >= 0),
  meio text not null check (meio in ('dinheiro', 'pix', 'cartao', 'notinha')),
  vendedor text not null,
  operador text not null,
  empresa text,
  num_notinha text,
  status text not null default 'ativa' check (status in ('ativa', 'cancelada')),
  motivo_cancelamento text,
  cancelado_por text,
  cancelado_em timestamptz,
  constraint notinha_completa check (
    meio <> 'notinha' or (empresa is not null and num_notinha is not null)
  )
);
create index if not exists vendas_data_idx on vendas (data);

create table if not exists retiradas (
  id bigint generated always as identity primary key,
  data date not null references dias (data),
  criado_em timestamptz not null default now(),
  valor integer not null check (valor > 0),
  retirado_por text not null,
  finalidade text not null,
  operador text not null
);
create index if not exists retiradas_data_idx on retiradas (data);

create table if not exists devolucoes (
  id bigint generated always as identity primary key,
  data date not null references dias (data),
  criado_em timestamptz not null default now(),
  valor integer not null check (valor > 0),
  meio text not null check (meio in ('dinheiro', 'pix', 'cartao', 'notinha')),
  motivo text not null,
  responsavel text not null
);
create index if not exists devolucoes_data_idx on devolucoes (data);

create table if not exists auditoria (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  quem text not null,
  acao text not null,
  data date,
  antes jsonb,
  depois jsonb
);

-- O site acessa o banco só pelo servidor. Com RLS ligado e sem políticas,
-- as chaves públicas do Supabase não leem nem gravam nada.
alter table acesso enable row level security;
alter table operadores enable row level security;
alter table vendedores enable row level security;
alter table dias enable row level security;
alter table vendas enable row level security;
alter table retiradas enable row level security;
alter table devolucoes enable row level security;
alter table auditoria enable row level security;

insert into operadores (nome) values
  ('Operador 1'), ('Operador 2'), ('Operador 3'), ('Operador 4')
on conflict (nome) do nothing;

insert into vendedores (nome) values
  ('Vendedor 1'), ('Vendedor 2'), ('Vendedor 3'), ('Vendedor 4'), ('Vendedor 5')
on conflict (nome) do nothing;
