-- rls_auto_enable is an event-trigger function (auto-enables RLS on new public
-- tables). Event triggers fire independently of EXECUTE grants, so it should
-- never be exposed as a callable RPC. Guarded so this is a no-op on projects
-- where the function does not exist.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
