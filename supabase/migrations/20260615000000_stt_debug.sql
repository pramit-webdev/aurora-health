-- Temporary diagnostic table for the STT pipeline (audio size vs transcript).
create table if not exists public.stt_debug (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  audio_bytes int,
  content_type text,
  transcript text,
  created_at timestamptz not null default now()
);
alter table public.stt_debug enable row level security;
drop policy if exists "anyone authed can insert stt debug" on public.stt_debug;
create policy "anyone authed can insert stt debug" on public.stt_debug
  for insert to authenticated with check (true);
