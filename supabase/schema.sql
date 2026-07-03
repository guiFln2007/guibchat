-- Gobchat — esquema Supabase (Postgres)
-- Migração do armazenamento JSON local (data/) para Postgres gerenciado.
-- Tudo escopado por workspace_id (uma conta de Instagram = um workspace).
--
-- O app acessa via service_role key (server-only). Não usamos Supabase Auth:
-- o login do dashboard continua sendo o nosso (scrypt em lib/password.ts).
-- Por isso RLS fica desligada — o acesso já é protegido pela camada do app
-- e a service_role key nunca vai pro cliente.

-- ---- Workspaces (contas) ----
create table if not exists workspaces (
  id             text primary key,            -- kebab-case estável (ex.: "adspogere")
  name           text not null,
  handle         text not null,
  ig_user_id     text not null,
  token          text not null,
  login_username text not null,
  login_salt     text not null,
  login_hash     text not null,
  owner          boolean not null default false
);
create index if not exists workspaces_ig_user_id_idx on workspaces (ig_user_id);
create index if not exists workspaces_login_username_idx on workspaces (lower(login_username));

-- ---- Automações ----
create table if not exists automations (
  id             text primary key,
  workspace_id   text not null references workspaces(id) on delete cascade,
  name           text not null,
  active         boolean not null default false,
  created_at     timestamptz not null default now(),
  trigger        jsonb not null,              -- { type, postIds, matchType, keywords }
  public_replies jsonb not null default '[]', -- string[]
  steps          jsonb not null default '[]', -- DmStep[]
  stats          jsonb not null default '{"triggered":0,"dmsSent":0,"commentsReplied":0,"clicks":0}'
);
create index if not exists automations_ws_idx on automations (workspace_id);

-- ---- Contatos ----
create table if not exists contacts (
  workspace_id      text not null references workspaces(id) on delete cascade,
  id                text not null,            -- IG user id do contato
  username          text,
  source            text not null,            -- comment | dm
  status            text not null default 'inscrito',
  first_interaction timestamptz not null default now(),
  last_interaction  timestamptz not null default now(),
  interactions      integer not null default 1,
  primary key (workspace_id, id)
);

-- ---- Caixa de Entrada ----
create table if not exists inbox (
  id               text primary key,
  workspace_id     text not null references workspaces(id) on delete cascade,
  contact_id       text not null,
  contact_username text,
  direction        text not null,             -- in | out
  text             text not null,
  timestamp        timestamptz not null default now(),
  via              text not null              -- dm | comment | bot | manual
);
create index if not exists inbox_ws_ts_idx on inbox (workspace_id, timestamp);

-- ---- Logs (atividade) ----
create table if not exists logs (
  id               text primary key,
  workspace_id     text not null references workspaces(id) on delete cascade,
  timestamp        timestamptz not null default now(),
  automation_id    text,
  automation_name  text,
  event            text not null,             -- comment | dm | postback
  from_username    text,
  from_id          text not null,
  matched_keyword  text,
  text             text,
  actions          jsonb not null default '[]',
  ok               boolean not null default true,
  error            text
);
create index if not exists logs_ws_ts_idx on logs (workspace_id, timestamp desc);

-- ---- Dedup de eventos do webhook ----
-- Em serverless cada invocação é isolada: o Set em memória não serve.
-- A unicidade do event_id (PK) garante o "processar 1x só" de forma durável.
create table if not exists processed_events (
  event_id  text primary key,
  seen_at   timestamptz not null default now()
);
