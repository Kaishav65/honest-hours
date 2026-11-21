-- Open sign-up (no invite code) with a hard cap on total users.
-- Free up slots by deleting inactive users in the Supabase dashboard.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  v_tz   text := coalesce(new.raw_user_meta_data ->> 'timezone', 'Asia/Kolkata');
begin
  if char_length(v_name) not between 1 and 20 then
    raise exception 'INVALID_DISPLAY_NAME';
  end if;

  if (select count(*) from public.profiles) >= 50 then
    raise exception 'USER_LIMIT_REACHED';
  end if;

  if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then
    v_tz := 'Asia/Kolkata';
  end if;

  insert into public.profiles (id, display_name, timezone) values (new.id, v_name, v_tz);
  perform private.seed_defaults(new.id);
  return new;
end $$;

-- Lets the sign-up page say "we're full" with a friendly message. Returns only true/false.
create function public.signups_open() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select count(*) from public.profiles) < 50;
$$;
revoke all on function public.signups_open() from public;
grant execute on function public.signups_open() to anon, authenticated;

-- The invite-code system is no longer used.
drop function public.check_invite_code(text);
drop table public.invite_codes;
