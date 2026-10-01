-- Cole isto no Supabase: SQL Editor > New query > Run

create table usuarios (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null,
  nome        text not null,
  email       text not null unique,
  senha_hash  text not null,
  criado_em   timestamptz not null default now()
);

create table reservas (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references usuarios(id) on delete cascade,
  data        date not null,
  inicio      time not null,
  fim         time not null,
  turma       text not null,
  laboratorio text not null,
  motivo      text not null,
  criado_em   timestamptz not null default now(),
  -- impede duas reservas no mesmo laboratório, dia e horário
  unique (laboratorio, data, inicio)
);

-- Bloqueia acesso direto pelo navegador: só as funções da API (service key) acessam.
alter table usuarios enable row level security;
alter table reservas enable row level security;
