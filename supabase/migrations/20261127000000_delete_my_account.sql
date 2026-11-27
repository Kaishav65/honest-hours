-- Lets a signed-in user delete their own account. Everything they own (profile, categories, entries,
-- day logs, coach messages, ...) goes with it through the existing "on delete cascade" links.
-- It frees one of the 50 user slots. Only the caller's own row can be deleted (auth.uid()).
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
