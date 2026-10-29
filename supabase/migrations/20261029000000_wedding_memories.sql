-- Wedding Memories: event folders, guest/couple memories, and their files.
-- Only the server (service role) touches these; RLS with no policies blocks
-- the public anon key entirely.

create table if not exists public.memory_folders (
  id          text primary key,
  name        text not null check (char_length(name) between 1 and 80),
  event_date  date,
  event_type  text check (char_length(event_type) <= 40),
  created_at  timestamptz not null default now()
);

create table if not exists public.memories (
  id          text primary key,
  folder_id   text not null references public.memory_folders (id) on delete cascade,
  source      text not null check (source in ('guest', 'couple')),
  photo_name  text not null,
  message     text check (char_length(message) <= 1000),
  guest_name  text check (char_length(guest_name) <= 60),
  reactions   jsonb not null default '{}'::jsonb,
  voice_name  text,
  created_at  timestamptz not null default now()
);

create index if not exists memories_folder_created_idx
  on public.memories (folder_id, created_at desc);

alter table public.memory_folders enable row level security;
alter table public.memories enable row level security;

-- Dashboard cards: photo count + the two latest photos for the thumbnail.
create or replace view public.memory_folder_summaries
with (security_invoker = true) as
select
  f.*,
  (select count(*) from public.memories m where m.folder_id = f.id) as photo_count,
  array(
    select m.photo_name from public.memories m
    where m.folder_id = f.id
    order by m.created_at desc
    limit 2
  ) as preview_names
from public.memory_folders f;

-- Atomic +1 so simultaneous reactions can't overwrite each other.
create or replace function public.increment_memory_reaction(p_memory_id text, p_emoji text)
returns setof public.memories
language sql
set search_path = ''
as $$
  update public.memories
  set reactions = jsonb_set(
    reactions,
    array[p_emoji],
    to_jsonb(coalesce((reactions ->> p_emoji)::int, 0) + 1)
  )
  where id = p_memory_id
  returning *;
$$;

revoke all on function public.increment_memory_reaction(text, text) from public, anon, authenticated;
grant execute on function public.increment_memory_reaction(text, text) to service_role;

revoke all on public.memory_folder_summaries from anon, authenticated;

-- Private bucket for photos and voice notes (20 MB per file).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memories', 'memories', false, 20971520, array['image/*', 'audio/*'])
on conflict (id) do nothing;
