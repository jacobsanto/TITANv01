-- Move RLS helper predicates into a private schema that PostgREST does not
-- expose, so they are no longer reachable via /rest/v1/rpc/ while remaining
-- usable inside RLS policies. This clears the
-- authenticated_security_definer_function_executable advisory for the helpers.
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

create function private.is_org_member(p_org_id uuid)
returns boolean
language sql security definer stable
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members
    where org_id = p_org_id and user_id = auth.uid()
  );
$$;

create function private.is_org_admin(p_org_id uuid)
returns boolean
language sql security definer stable
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members
    where org_id = p_org_id and user_id = auth.uid()
    and role in ('super_admin', 'admin')
  );
$$;

grant execute on function private.is_org_member(uuid) to authenticated, service_role;
grant execute on function private.is_org_admin(uuid) to authenticated, service_role;

-- Repoint every policy at the private helpers.
alter policy "org_select" on organizations using (private.is_org_member(id));
alter policy "org_update" on organizations using (private.is_org_admin(id));

alter policy "members_select" on organization_members using (user_id = auth.uid() or private.is_org_member(org_id));
alter policy "members_insert" on organization_members with check (private.is_org_admin(org_id) or user_id = auth.uid());
alter policy "members_update" on organization_members using (private.is_org_admin(org_id));
alter policy "members_delete" on organization_members using (private.is_org_admin(org_id));

alter policy "snapshots_select" on config_snapshots using (private.is_org_member(org_id));
alter policy "snapshots_insert" on config_snapshots with check (private.is_org_admin(org_id));
alter policy "snapshots_update" on config_snapshots using (private.is_org_admin(org_id));

alter policy "settings_select" on user_settings using (user_id = auth.uid() and private.is_org_member(org_id));
alter policy "settings_insert" on user_settings with check (user_id = auth.uid() and private.is_org_member(org_id));
alter policy "settings_update" on user_settings using (user_id = auth.uid() and private.is_org_member(org_id));
alter policy "settings_delete" on user_settings using (user_id = auth.uid() and private.is_org_member(org_id));

alter policy "companies_select" on companies using (private.is_org_member(org_id));
alter policy "companies_insert" on companies with check (private.is_org_admin(org_id));
alter policy "companies_update" on companies using (private.is_org_admin(org_id));
alter policy "companies_delete" on companies using (private.is_org_admin(org_id));

alter policy "invoices_select" on invoices using (private.is_org_member(org_id));
alter policy "invoices_insert" on invoices with check (private.is_org_member(org_id));
alter policy "invoices_update" on invoices using (private.is_org_member(org_id));

alter policy "bank_docs_select" on bank_docs using (private.is_org_member(org_id));
alter policy "bank_docs_insert" on bank_docs with check (private.is_org_member(org_id));
alter policy "bank_docs_update" on bank_docs using (private.is_org_member(org_id));

alter policy "skipped_docs_select" on skipped_docs using (private.is_org_member(org_id));
alter policy "skipped_docs_insert" on skipped_docs with check (private.is_org_member(org_id));
alter policy "skipped_docs_delete" on skipped_docs using (private.is_org_admin(org_id));

alter policy "job_runs_select" on job_runs using (private.is_org_member(org_id));
alter policy "job_runs_insert" on job_runs with check (private.is_org_member(org_id));

alter policy "queue_select" on processing_queue using (private.is_org_member(org_id));
alter policy "queue_insert" on processing_queue with check (private.is_org_member(org_id));

alter policy "audit_select" on audit_log using (private.is_org_member(org_id));
alter policy "audit_insert" on audit_log with check (private.is_org_member(org_id));

alter policy "flags_select" on system_flags using (private.is_org_member(org_id));
alter policy "flags_update" on system_flags using (private.is_org_admin(org_id));

alter policy "bank_rules_select" on bank_rules using (private.is_org_member(org_id));
alter policy "bank_rules_insert" on bank_rules with check (private.is_org_admin(org_id));
alter policy "bank_rules_update" on bank_rules using (private.is_org_admin(org_id));
alter policy "bank_rules_delete" on bank_rules using (private.is_org_admin(org_id));

alter policy "naming_rules_select" on naming_rules using (private.is_org_member(org_id));
alter policy "naming_rules_insert" on naming_rules with check (private.is_org_admin(org_id));
alter policy "naming_rules_update" on naming_rules using (private.is_org_admin(org_id));
alter policy "naming_rules_delete" on naming_rules using (private.is_org_admin(org_id));

alter policy "filing_flows_select" on filing_flows using (private.is_org_member(org_id));
alter policy "filing_flows_insert" on filing_flows with check (private.is_org_admin(org_id));
alter policy "filing_flows_update" on filing_flows using (private.is_org_admin(org_id));
alter policy "filing_flows_delete" on filing_flows using (private.is_org_admin(org_id));

alter policy "rules_select" on rules_engine using (private.is_org_member(org_id));
alter policy "rules_insert" on rules_engine with check (private.is_org_admin(org_id));
alter policy "rules_update" on rules_engine using (private.is_org_admin(org_id));
alter policy "rules_delete" on rules_engine using (private.is_org_admin(org_id));

alter policy "aliases_select" on supplier_aliases using (private.is_org_member(org_id));
alter policy "aliases_insert" on supplier_aliases with check (private.is_org_admin(org_id));
alter policy "aliases_update" on supplier_aliases using (private.is_org_admin(org_id));
alter policy "aliases_delete" on supplier_aliases using (private.is_org_admin(org_id));

alter policy "prompts_select" on extraction_prompts using (private.is_org_member(org_id));
alter policy "prompts_insert" on extraction_prompts with check (private.is_org_admin(org_id));
alter policy "prompts_update" on extraction_prompts using (private.is_org_admin(org_id));
alter policy "prompts_delete" on extraction_prompts using (private.is_org_admin(org_id));

alter policy "invitations_select" on invitations using (private.is_org_member(org_id));
alter policy "invitations_insert" on invitations with check (private.is_org_admin(org_id));
alter policy "invitations_delete" on invitations using (private.is_org_admin(org_id));

-- Now that nothing references them, remove the public (API-exposed) helpers.
drop function public.is_org_member(uuid);
drop function public.is_org_admin(uuid);
