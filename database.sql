-- Estrutura inicial do banco de dados para o Bar do Pereira

create table produtos (
  id bigint generated always as identity primary key,
  nome text not null,
  descricao text,
  preco numeric(10,2) not null,
  estoque integer not null default 0,
  categoria text,
  ativo boolean not null default true,
  created_at timestamp default now()
);

create table comandas (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  cliente_nome text,
  mesa text not null default 'Nenhuma',
  status text not null default 'Aberta',
  created_at timestamp default now()
);

create table comanda_itens (
  id bigint generated always as identity primary key,
  comanda_id bigint not null references comandas(id) on delete cascade,
  produto_id bigint references produtos(id),
  descricao text not null,
  quantidade integer not null,
  valor_unitario numeric(10,2) not null,
  tipo text not null default 'produto',
  created_at timestamp default now()
);

create table mesas_sinuca (
  id bigint generated always as identity primary key,
  nome text not null unique,
  status text not null default 'Quitada',
  fichas_lancadas integer not null default 0,
  fichas_pagas integer not null default 0,
  fichas_pendentes integer not null default 0,
  created_at timestamp default now()
);

insert into mesas_sinuca (nome) values ('Mesa 1'), ('Mesa 2');

create table clientes_fiado (
  id bigint generated always as identity primary key,
  nome text not null,
  telefone text,
  observacoes text,
  created_at timestamp default now()
);

create table fiado_movimentacoes (
  id bigint generated always as identity primary key,
  cliente_id bigint not null references clientes_fiado(id) on delete cascade,
  tipo text not null, -- compra, ficha, pagamento_parcial, quitacao_total
  descricao text,
  valor numeric(10,2) not null,
  mesa text,
  created_at timestamp default now()
);

create table pagamentos (
  id bigint generated always as identity primary key,
  comanda_id bigint references comandas(id) on delete set null,
  forma_pagamento text not null,
  valor_total numeric(10,2) not null,
  valor_recebido numeric(10,2),
  troco numeric(10,2),
  dividido_pessoas integer,
  valor_por_pessoa numeric(10,2),
  created_at timestamp default now()
);
