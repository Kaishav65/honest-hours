-- =====================================================================
-- Honest Hours — initial schema (PLAN.md §10)
-- Run once in Supabase → SQL Editor.
--
-- Rules:
--   * Every user table has user_id (defaults to the logged-in user).
--   * RLS: a user can only read and write their own rows.
--   * Child rows reference the parent with (id, user_id), so a row can never
--     point at another user's category / entry / subject.
--   * Entries of the same user can't overlap (exclusion constraint).
--   * Sign-up needs a valid invite code; the profile + default categories
--     are created by a trigger on auth.users.
-- =====================================================================

create extension if not exists btree_gist with schema extensions;
create schema if not exists private;   -- not exposed through the Data API

-- ---------------------------------------------------------------------
-- Invite codes (no API access at all; only the sign-up trigger uses it)
-- ---------------------------------------------------------------------
create table public.invite_codes (
  code        text primary key check (code = upper(code) and char_length(code) between 4 and 32),
  max_uses    int  not null default 5 check (max_uses > 0),
  used_count  int  not null default 0 check (used_count >= 0),
  active      boolean not null default true,
  note        text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Profiles: one per user
-- ---------------------------------------------------------------------
create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  display_name          text not null check (char_length(btrim(display_name)) between 1 and 20),
  timezone              text not null default 'Asia/Kolkata',
  day_start_hour        smallint not null default 3 check (day_start_hour between 0 and 12),
  checkin_interval_min  smallint not null default 30 check (checkin_interval_min in (15, 30, 45, 60)),
  coach_strictness      text not null default 'balanced' check (coach_strictness in ('gentle', 'balanced', 'strict')),
  weekday_goal_min      int  not null default 120 check (weekday_goal_min between 0 and 1440),
  weekend_goal_min      int  not null default 240 check (weekend_goal_min between 0 and 1440),
  status                text not null default 'normal' check (status in ('normal', 'busy', 'sleeping', 'pomodoro')),
  status_since          timestamptz,
  status_until          timestamptz,
  status_label          text,
  settings              jsonb not null default '{
    "theme": "system",
    "schedule": {
      "weekday": { "office": true,  "office_start": "10:00", "office_end": "18:00", "office_checkin_min": 120 },
      "weekend": { "office": false }
    },
    "busy_presets": [
      { "label": "Interview", "minutes": 60 },
      { "label": "Meeting",   "minutes": 60 },
      { "label": "Movie",     "minutes": 150 }
    ]
  }'::jsonb,
  created_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Categories + their questions
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  icon        text,
  color       text,
  kind        text not null check (kind in ('sleep', 'study', 'work', 'commute', 'routine', 'chore', 'entertainment', 'rest')),
  value       text not null check (value in ('productive', 'neutral', 'waste')),
  sort_order  int  not null default 0,
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

create table public.category_questions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category_id  uuid not null,
  label        text not null check (char_length(btrim(label)) between 1 and 60),
  type         text not null check (type in ('rating_1_5', 'yes_no', 'single_choice', 'multi_choice', 'text', 'time', 'number')),
  options      jsonb,
  system_key   text check (system_key in ('planned', 'trigger', 'focus', 'phone_checks', 'mood_after')),
  sort_order   int  not null default 0,
  archived     boolean not null default false,
  created_at   timestamptz not null default now(),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------
-- Subjects (study topics + goal hours)
-- ---------------------------------------------------------------------
create table public.subjects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 40),
  target_hours  numeric(6, 1) check (target_hours > 0),
  archived      boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

-- ---------------------------------------------------------------------
-- Entries: the core table. One row per activity block. Unknown = no row.
-- ---------------------------------------------------------------------
create table public.entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category_id   uuid not null,
  start_at      timestamptz not null,
  end_at        timestamptz not null,
  source        text not null check (source in ('checkin', 'pomodoro', 'busy', 'sleep_button', 'office_day', 'manual', 'backfill')),
  subject_id    uuid,
  focus         smallint check (focus between 1 and 5),
  planned       boolean,
  trigger       text check (trigger in ('bored', 'tired', 'stressed', 'habit', 'break')),
  phone_checks  smallint check (phone_checks >= 0),
  mood_after    text check (mood_after in ('better', 'same', 'worse')),
  answers       jsonb not null default '{}'::jsonb,   -- custom questions: { "<question_id>": value }
  note          text,
  created_at    timestamptz not null default now(),
  check (end_at > start_at),
  unique (id, user_id),
  foreign key (category_id, user_id) references public.categories (id, user_id),
  foreign key (subject_id, user_id)  references public.subjects (id, user_id),
  -- Same user's entries can't overlap. '[)' = touching blocks (10:00–11:00, 11:00–11:30) are fine.
  constraint entries_no_overlap exclude using gist (
    user_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
);
create index entries_user_start_idx on public.entries (user_id, start_at desc);

-- "While doing" tags (Dinner + YouTube). The main entry owns the time.
create table public.entry_tags (
  entry_id         uuid not null,
  tag_category_id  uuid not null,
  user_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  primary key (entry_id, tag_category_id),
  foreign key (entry_id, user_id)        references public.entries (id, user_id) on delete cascade,
  foreign key (tag_category_id, user_id) references public.categories (id, user_id)
);

-- ---------------------------------------------------------------------
-- Pomodoros (including stopped-early ones, for an honest completion rate)
-- ---------------------------------------------------------------------
create table public.pomodoros (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  subject_id   uuid,
  started_at   timestamptz not null,
  ended_at     timestamptz,
  planned_min  smallint not null default 25 check (planned_min between 1 and 180),
  completed    boolean not null default false,
  entry_id     uuid references public.entries (id) on delete set null,
  foreign key (subject_id, user_id) references public.subjects (id, user_id)
);
create index pomodoros_user_started_idx on public.pomodoros (user_id, started_at desc);

-- ---------------------------------------------------------------------
-- Check-in prompts (tracking completeness, late-night "go quiet" rule)
-- ---------------------------------------------------------------------
create table public.checkins (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  prompted_at  timestamptz not null,
  answered_at  timestamptz,
  status       text not null check (status in ('answered', 'skipped', 'missed'))
);
create index checkins_user_prompted_idx on public.checkins (user_id, prompted_at desc);

-- ---------------------------------------------------------------------
-- Day logs: one per user per day (goal snapshot, plan, sleep, review)
-- ---------------------------------------------------------------------
create table public.day_logs (
  user_id            uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day                date not null,
  study_goal_min     int  not null check (study_goal_min between 0 and 1440),
  planned_study_min  int  check (planned_study_min between 0 and 1440),
  wake_at            timestamptz,
  sleep_quality      smallint check (sleep_quality between 1 and 5),
  tomorrow_goal      text,
  review_done        boolean not null default false,
  freeze_earned      smallint not null default 0 check (freeze_earned >= 0),
  freeze_used        boolean not null default false,
  primary key (user_id, day)
);

-- ---------------------------------------------------------------------
-- Coach messages that were shown (escalation, no repeats, which nudges work)
-- ---------------------------------------------------------------------
create table public.coach_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  rule_key    text not null,
  severity    text not null check (severity in ('scold', 'praise', 'recovery', 'pattern', 'info')),
  text        text not null,
  created_at  timestamptz not null default now(),
  seen_at     timestamptz,
  acted_on    boolean not null default false
);
create index coach_messages_user_created_idx on public.coach_messages (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Routines: one-tap templates like "Office day"
--   items = [{ "category_id", "start": "HH:MM", "minutes", "answers": {...} }]
-- ---------------------------------------------------------------------
create table public.routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  items       jsonb not null default '[]'::jsonb,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- Row Level Security + grants
-- =====================================================================
alter table public.invite_codes enable row level security;   -- no policies = no API access
revoke all on public.invite_codes from anon, authenticated;

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;
create policy "own profile: read" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "own profile: update" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array[
    'categories', 'category_questions', 'subjects', 'entries', 'entry_tags',
    'pomodoros', 'checkins', 'day_logs', 'coach_messages', 'routines'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- =====================================================================
-- Default categories, questions and the "Office day" routine for a new user
-- (PLAN.md §3, §4.4). Option values are lowercase; the UI capitalises them.
-- =====================================================================
create function private.seed_defaults(p_user uuid) returns void
language plpgsql set search_path = '' as $$
declare
  c_study uuid; c_office uuid; c_commute uuid; c_insta uuid; c_yt uuid; c_movie uuid; c_rest uuid;
  q_mode uuid;
begin
  insert into public.categories (user_id, name, icon, kind, value, sort_order)
    values (p_user, 'Study', 'book-open', 'study', 'productive', 10) returning id into c_study;
  insert into public.categories (user_id, name, icon, kind, value, sort_order)
    values (p_user, 'Office', 'briefcase', 'work', 'productive', 20) returning id into c_office;
  insert into public.categories (user_id, name, icon, kind, value, sort_order)
    values (p_user, 'Commute', 'bus', 'commute', 'neutral', 30) returning id into c_commute;
  insert into public.categories (user_id, name, icon, kind, value, sort_order) values
    (p_user, 'Meal',          'utensils', 'routine', 'neutral', 40),
    (p_user, 'Getting ready', 'shirt',    'routine', 'neutral', 50);
  insert into public.categories (user_id, name, icon, kind, value, sort_order)
    values (p_user, 'Instagram', 'smartphone', 'entertainment', 'waste', 60) returning id into c_insta;
  insert into public.categories (user_id, name, icon, kind, value, sort_order)
    values (p_user, 'YouTube', 'play', 'entertainment', 'waste', 70) returning id into c_yt;
  insert into public.categories (user_id, name, icon, kind, value, sort_order)
    values (p_user, 'Movie / Series', 'clapperboard', 'entertainment', 'waste', 80) returning id into c_movie;
  insert into public.categories (user_id, name, icon, kind, value, sort_order) values
    (p_user, 'Chores', 'washing-machine', 'chore', 'neutral', 90);
  insert into public.categories (user_id, name, icon, kind, value, sort_order)
    values (p_user, 'Rest', 'sofa', 'rest', 'neutral', 100) returning id into c_rest;
  insert into public.categories (user_id, name, icon, kind, value, sort_order) values
    (p_user, 'Sleep', 'moon', 'sleep', 'neutral', 110);

  insert into public.category_questions (user_id, category_id, label, type, options, system_key, sort_order) values
    (p_user, c_study,  'Focus',          'rating_1_5',    null, 'focus',        10),
    (p_user, c_study,  'Phone checks',   'number',        null, 'phone_checks', 20),
    (p_user, c_study,  'What I learned', 'text',          null, null,           30),
    (p_user, c_office, 'Work type',      'single_choice', '["deep work","meetings","mixed"]', null, 10),
    (p_user, c_office, 'Focus',          'rating_1_5',    null, 'focus',        20),
    (p_user, c_commute,'What I did',     'single_choice', '["podcast","revision","scrolling","nothing"]', null, 20),
    (p_user, c_insta,  'Planned?',       'yes_no',        null, 'planned',      10),
    (p_user, c_insta,  'Why?',           'single_choice', '["bored","tired","stressed","habit","break"]', 'trigger', 20),
    (p_user, c_insta,  'Mood after',     'single_choice', '["better","same","worse"]', 'mood_after', 30),
    (p_user, c_yt,     'Planned?',       'yes_no',        null, 'planned',      10),
    (p_user, c_yt,     'Why?',           'single_choice', '["bored","tired","stressed","habit","break"]', 'trigger', 20),
    (p_user, c_yt,     'Mood after',     'single_choice', '["better","same","worse"]', 'mood_after', 30),
    (p_user, c_movie,  'Planned?',       'yes_no',        null, 'planned',      10),
    (p_user, c_movie,  'Name',           'text',          null, null,           20),
    (p_user, c_rest,   'Felt refreshed?','yes_no',        null, null,           10);

  insert into public.category_questions (user_id, category_id, label, type, options, system_key, sort_order)
    values (p_user, c_commute, 'Mode', 'single_choice', '["walk","bus","auto","other"]', null, 10)
    returning id into q_mode;

  insert into public.routines (user_id, name, items, sort_order) values (p_user, 'Office day', jsonb_build_array(
    jsonb_build_object('category_id', c_commute, 'start', '09:20', 'minutes', 20,  'answers', jsonb_build_object(q_mode, 'walk')),
    jsonb_build_object('category_id', c_commute, 'start', '09:40', 'minutes', 20,  'answers', jsonb_build_object(q_mode, 'bus')),
    jsonb_build_object('category_id', c_office,  'start', '10:00', 'minutes', 480, 'answers', '{}'::jsonb),
    jsonb_build_object('category_id', c_commute, 'start', '18:00', 'minutes', 20,  'answers', jsonb_build_object(q_mode, 'bus')),
    jsonb_build_object('category_id', c_commute, 'start', '18:20', 'minutes', 20,  'answers', jsonb_build_object(q_mode, 'walk'))
  ), 10);
end $$;

-- =====================================================================
-- Sign-up: check invite code + display name, create profile + defaults.
-- Raising an exception cancels the sign-up.
-- Note: users added from the Supabase dashboard also need these fields,
-- so create accounts through the app's sign-up page.
-- =====================================================================
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_code text := upper(btrim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
  v_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  v_tz   text := coalesce(new.raw_user_meta_data ->> 'timezone', 'Asia/Kolkata');
begin
  if char_length(v_name) not between 1 and 20 then
    raise exception 'INVALID_DISPLAY_NAME';
  end if;

  update public.invite_codes
     set used_count = used_count + 1
   where code = v_code and active and used_count < max_uses;
  if not found then
    raise exception 'INVALID_INVITE_CODE';
  end if;

  if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then
    v_tz := 'Asia/Kolkata';
  end if;

  insert into public.profiles (id, display_name, timezone) values (new.id, v_name, v_tz);
  perform private.seed_defaults(new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Lets the sign-up page say "invalid invite code" before submitting.
-- Returns only true/false; never reveals codes.
create function public.check_invite_code(p_code text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.invite_codes
     where code = upper(btrim(p_code)) and active and used_count < max_uses
  );
$$;
revoke all on function public.check_invite_code(text) from public;
grant execute on function public.check_invite_code(text) to anon, authenticated;
