-- Each social app is its own category (so totals, "wasted today" and coach messages
-- can name the app), plus Walking and Swimming.
--   * Social apps: kind entertainment, counts as waste, with the built-in questions
--     Planned? / Why? / Mood after (system_key planned / trigger / mood_after, which
--     are saved to their own entry columns and drive "wasted = waste time not planned").
--   * Walking / Swimming: kind rest, neutral (free time at home, never "wasted").
-- Updates the sign-up defaults and backfills every existing user. Safe to re-run.

-- ---------------------------------------------------------------------
-- 1. Sign-up defaults
-- ---------------------------------------------------------------------
create or replace function private.seed_defaults(p_user uuid) returns void
language plpgsql set search_path = '' as $$
declare
  c_study uuid; c_office uuid; c_commute uuid; c_yt uuid; c_movie uuid; c_rest uuid;
  c_app uuid; v_app record;
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

  -- Social apps (own category each) + their built-in questions
  for v_app in select * from (values
      ('Instagram', 60), ('TikTok', 62), ('Facebook', 64), ('Snapchat', 66)
    ) as a(name, sort_order)
  loop
    insert into public.categories (user_id, name, icon, kind, value, sort_order)
      values (p_user, v_app.name, 'smartphone', 'entertainment', 'waste', v_app.sort_order)
      returning id into c_app;
    insert into public.category_questions (user_id, category_id, label, type, options, system_key, sort_order) values
      (p_user, c_app, 'Planned?',   'yes_no',        null, 'planned',    10),
      (p_user, c_app, 'Why?',       'single_choice', '["bored","tired","stressed","habit","break"]', 'trigger', 20),
      (p_user, c_app, 'Mood after', 'single_choice', '["better","same","worse"]', 'mood_after', 30);
  end loop;

  insert into public.categories (user_id, name, icon, kind, value, sort_order)
    values (p_user, 'YouTube', 'play', 'entertainment', 'waste', 70) returning id into c_yt;
  insert into public.categories (user_id, name, icon, kind, value, sort_order)
    values (p_user, 'Movie / Series', 'clapperboard', 'entertainment', 'waste', 80) returning id into c_movie;
  insert into public.categories (user_id, name, icon, kind, value, sort_order) values
    (p_user, 'Chores',   'washing-machine', 'chore', 'neutral', 90),
    (p_user, 'Walking',  'footprints',      'rest',  'neutral', 92),
    (p_user, 'Swimming', 'waves',           'rest',  'neutral', 94);
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

-- ---------------------------------------------------------------------
-- 2. Existing users
-- ---------------------------------------------------------------------
do $$
declare
  p record;
  c record;
begin
  -- Undo "Instagram renamed to Social Media + 'Which app you used'" (kept the
  -- question's old answers on entries; it is only archived, never deleted).
  update public.categories s
     set name = 'Instagram'
   where s.name = 'Social Media'
     and not exists (select 1 from public.categories i where i.user_id = s.user_id and i.name = 'Instagram');

  update public.category_questions q
     set archived = true
   where q.label = 'Which app you used'
     and q.system_key is null
     and q.category_id in (select id from public.categories where name = 'Instagram');

  for p in select id from public.profiles loop
    insert into public.categories (user_id, name, icon, kind, value, sort_order) values
      (p.id, 'Instagram', 'smartphone', 'entertainment', 'waste', 60),
      (p.id, 'TikTok',    'smartphone', 'entertainment', 'waste', 62),
      (p.id, 'Facebook',  'smartphone', 'entertainment', 'waste', 64),
      (p.id, 'Snapchat',  'smartphone', 'entertainment', 'waste', 66),
      (p.id, 'Walking',   'footprints', 'rest',          'neutral', 92),
      (p.id, 'Swimming',  'waves',      'rest',          'neutral', 94)
    on conflict (user_id, name) do nothing;

    -- Built-in questions for the four social apps (skip any the category already has)
    for c in
      select id from public.categories
       where user_id = p.id and name in ('Instagram', 'TikTok', 'Facebook', 'Snapchat')
    loop
      insert into public.category_questions (user_id, category_id, label, type, options, system_key, sort_order)
      select p.id, c.id, v.label, v.type, v.options, v.system_key, v.sort_order
        from (values
          ('Planned?',   'yes_no',        null::jsonb, 'planned',    10),
          ('Why?',       'single_choice', '["bored","tired","stressed","habit","break"]'::jsonb, 'trigger', 20),
          ('Mood after', 'single_choice', '["better","same","worse"]'::jsonb, 'mood_after', 30)
        ) as v(label, type, options, system_key, sort_order)
       where not exists (
         select 1 from public.category_questions q
          where q.category_id = c.id and q.system_key = v.system_key
       );
    end loop;
  end loop;
end $$;
