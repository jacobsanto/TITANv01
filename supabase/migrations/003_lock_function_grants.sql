-- Tighten EXECUTE grants. Creating a function implicitly grants EXECUTE to
-- PUBLIC, so revoking from anon/authenticated alone is not enough — the PUBLIC
-- grant must be removed too.

-- handle_new_user is a trigger-only function; it should never be RPC-callable.
-- Triggers run as the table owner regardless of these grants.
revoke execute on function handle_new_user() from public, anon, authenticated;

-- Helper predicates must stay executable for authenticated (RLS evaluates them),
-- but anon has no business calling them via RPC. Drop the implicit PUBLIC grant
-- and re-grant only to authenticated.
revoke execute on function is_org_member(uuid) from public, anon;
grant execute on function is_org_member(uuid) to authenticated;

revoke execute on function is_org_admin(uuid) from public, anon;
grant execute on function is_org_admin(uuid) to authenticated;
