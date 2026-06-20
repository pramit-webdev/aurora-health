-- Aurora — Supabase schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run).

-- ============ PROFILES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  age int,
  gender text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  height_cm numeric,
  weight_kg numeric,
  wake_time text,
  bed_time text,
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'very_active')),
  goals text[] not null default '{}',
  notification_prefs jsonb not null default '{"hydration": true, "sleep": true, "habits": true, "insights": true}',
  water_goal_ml int not null default 2500,
  sleep_goal_min int not null default 480,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ WATER ============
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_ml int not null check (amount_ml > 0 and amount_ml <= 5000),
  logged_at timestamptz not null default now()
);
create index if not exists water_logs_user_time on public.water_logs (user_id, logged_at desc);

-- ============ SLEEP ============
create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  bedtime timestamptz not null,
  wake_time timestamptz not null,
  duration_min int not null check (duration_min > 0 and duration_min <= 1440),
  quality int check (quality between 1 and 5),
  unique (user_id, date)
);
create index if not exists sleep_logs_user_date on public.sleep_logs (user_id, date desc);

-- ============ HABITS ============
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  emoji text not null default '✨',
  time_of_day text not null default 'anytime' check (time_of_day in ('morning', 'afternoon', 'evening', 'anytime')),
  days_of_week int[] not null default '{1,2,3,4,5,6,7}',
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  status text not null check (status in ('completed', 'skipped')),
  unique (habit_id, date)
);
create index if not exists habit_logs_user_date on public.habit_logs (user_id, date desc);

-- ============ NUTRITION ============
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  description text not null,
  calories int not null default 0,
  protein_g int not null default 0,
  carbs_g int not null default 0,
  fat_g int not null default 0,
  logged_at timestamptz not null default now()
);
create index if not exists meals_user_time on public.meals (user_id, logged_at desc);

-- ============ AI: INSIGHTS / MEMORY / CHAT ============
create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  category text not null default 'general' check (category in ('hydration', 'sleep', 'habits', 'nutrition', 'general')),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_user_time on public.chat_messages (user_id, created_at desc);

-- ============ ROW LEVEL SECURITY ============
alter table public.profiles enable row level security;
alter table public.water_logs enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.meals enable row level security;
alter table public.insights enable row level security;
alter table public.memories enable row level security;
alter table public.chat_messages enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own water" on public.water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own sleep" on public.sleep_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own habits" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own habit logs" on public.habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own meals" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own insights" on public.insights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own memories" on public.memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own chat" on public.chat_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
