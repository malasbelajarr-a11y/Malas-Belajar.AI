-- Jalankan sekali di Supabase SQL Editor.
create table if not exists public.wacawaci_resources (
  id text primary key,
  kind text not null,
  title text not null,
  description text not null default '',
  url text not null default '',
  is_public boolean not null default true,
  created_by text not null default 'Mentor Malas Belajar',
  level text not null default 'nguli',
  subtest text not null default 'pu',
  created_at timestamptz not null default now()
);

create index if not exists wacawaci_resources_subtest_idx on public.wacawaci_resources(subtest);
create index if not exists wacawaci_resources_level_idx on public.wacawaci_resources(level);

create table if not exists public.rodi_questions (
  id text primary key,
  chapter text not null,
  chapter_label text not null,
  number integer not null default 1,
  difficulty text not null default 'Sedang',
  topic text not null default '',
  prompt text not null,
  answer text not null default '',
  steps jsonb not null default '[]'::jsonb,
  is_final boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  correct_option integer,
  irt_difficulty double precision not null default 0,
  irt_discrimination double precision not null default 1,
  level text not null default 'nguli',
  trap_tip text not null default '',
  video_url text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists rodi_questions_chapter_idx on public.rodi_questions(chapter);
create index if not exists rodi_questions_level_idx on public.rodi_questions(level);

-- API memakai service-role key di server, jadi RLS boleh tetap aktif.
alter table public.wacawaci_resources enable row level security;
alter table public.rodi_questions enable row level security;
