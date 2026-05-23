-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_org_members_user on organization_members(user_id);
create index if not exists idx_org_members_org on organization_members(org_id);
create index if not exists idx_config_snapshots_org_active on config_snapshots(org_id, is_active);
create index if not exists idx_companies_org on companies(org_id);
create index if not exists idx_companies_setup on companies(org_id, setup_id);
create index if not exists idx_invoices_org_status on invoices(org_id, status, created_at desc);
create index if not exists idx_invoices_needs_review on invoices(org_id, needs_review) where needs_review = true;
create index if not exists idx_bank_docs_org on bank_docs(org_id, created_at desc);
create index if not exists idx_skipped_docs_org on skipped_docs(org_id, created_at desc);
create index if not exists idx_job_runs_org_status on job_runs(org_id, status, started_at desc);
create index if not exists idx_audit_log_org on audit_log(org_id, created_at desc);
create index if not exists idx_system_flags_org_severity on system_flags(org_id, severity, resolved);
create index if not exists idx_processing_queue_status on processing_queue(org_id, status);
create index if not exists idx_bank_rules_setup on bank_rules(org_id, setup_id);
create index if not exists idx_naming_rules_setup on naming_rules(org_id, setup_id);
create index if not exists idx_filing_flows_setup on filing_flows(org_id, setup_id);
create index if not exists idx_rules_engine_setup on rules_engine(org_id, setup_id);
create index if not exists idx_supplier_aliases_setup on supplier_aliases(org_id, setup_id);
create index if not exists idx_extraction_prompts_setup on extraction_prompts(org_id, setup_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table organization_members enable row level security;
alter table config_snapshots enable row level security;
alter table user_settings enable row level security;
alter table companies enable row level security;
alter table invoices enable row level security;
alter table bank_docs enable row level security;
alter table skipped_docs enable row level security;
alter table job_runs enable row level security;
alter table processing_queue enable row level security;
alter table audit_log enable row level security;
alter table system_flags enable row level security;
alter table bank_rules enable row level security;
alter table naming_rules enable row level security;
alter table filing_flows enable row level security;
alter table rules_engine enable row level security;
alter table supplier_aliases enable row level security;
alter table extraction_prompts enable row level security;
alter table invitations enable row level security;

-- Helper: is authenticated user a member of this org?
create or replace function is_org_member(p_org_id uuid)
returns boolean
language sql security definer stable
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members
    where org_id = p_org_id and user_id = auth.uid()
  );
$$;

-- Helper: is authenticated user an admin/super_admin of this org?
create or replace function is_org_admin(p_org_id uuid)
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

-- organizations
create policy "org_select" on organizations for select using (is_org_member(id));
create policy "org_insert" on organizations for insert to authenticated with check (true);
create policy "org_update" on organizations for update using (is_org_admin(id));

-- profiles
create policy "profiles_select" on profiles for select using (
  id = auth.uid() or
  exists (
    select 1 from organization_members om1
    join organization_members om2 on om1.org_id = om2.org_id
    where om1.user_id = auth.uid() and om2.user_id = profiles.id
  )
);
create policy "profiles_insert" on profiles for insert with check (id = auth.uid());
create policy "profiles_update" on profiles for update using (id = auth.uid());

-- organization_members
create policy "members_select" on organization_members for select using (
  user_id = auth.uid() or is_org_member(org_id)
);
create policy "members_insert" on organization_members for insert with check (
  is_org_admin(org_id) or user_id = auth.uid()
);
create policy "members_update" on organization_members for update using (is_org_admin(org_id));
create policy "members_delete" on organization_members for delete using (is_org_admin(org_id));

-- config_snapshots
create policy "snapshots_select" on config_snapshots for select using (is_org_member(org_id));
create policy "snapshots_insert" on config_snapshots for insert with check (is_org_admin(org_id));
create policy "snapshots_update" on config_snapshots for update using (is_org_admin(org_id));

-- user_settings
create policy "settings_select" on user_settings for select using (user_id = auth.uid() and is_org_member(org_id));
create policy "settings_insert" on user_settings for insert with check (user_id = auth.uid() and is_org_member(org_id));
create policy "settings_update" on user_settings for update using (user_id = auth.uid() and is_org_member(org_id));
create policy "settings_delete" on user_settings for delete using (user_id = auth.uid() and is_org_member(org_id));

-- companies
create policy "companies_select" on companies for select using (is_org_member(org_id));
create policy "companies_insert" on companies for insert with check (is_org_admin(org_id));
create policy "companies_update" on companies for update using (is_org_admin(org_id));
create policy "companies_delete" on companies for delete using (is_org_admin(org_id));

-- invoices
create policy "invoices_select" on invoices for select using (is_org_member(org_id));
create policy "invoices_insert" on invoices for insert with check (is_org_member(org_id));
create policy "invoices_update" on invoices for update using (is_org_member(org_id));

-- bank_docs
create policy "bank_docs_select" on bank_docs for select using (is_org_member(org_id));
create policy "bank_docs_insert" on bank_docs for insert with check (is_org_member(org_id));
create policy "bank_docs_update" on bank_docs for update using (is_org_member(org_id));

-- skipped_docs
create policy "skipped_docs_select" on skipped_docs for select using (is_org_member(org_id));
create policy "skipped_docs_insert" on skipped_docs for insert with check (is_org_member(org_id));
create policy "skipped_docs_delete" on skipped_docs for delete using (is_org_admin(org_id));

-- job_runs
create policy "job_runs_select" on job_runs for select using (is_org_member(org_id));
create policy "job_runs_insert" on job_runs for insert with check (is_org_member(org_id));

-- processing_queue
create policy "queue_select" on processing_queue for select using (is_org_member(org_id));
create policy "queue_insert" on processing_queue for insert with check (is_org_member(org_id));

-- audit_log
create policy "audit_select" on audit_log for select using (is_org_member(org_id));
create policy "audit_insert" on audit_log for insert with check (is_org_member(org_id));

-- system_flags
create policy "flags_select" on system_flags for select using (is_org_member(org_id));
create policy "flags_update" on system_flags for update using (is_org_admin(org_id));

-- bank_rules
create policy "bank_rules_select" on bank_rules for select using (is_org_member(org_id));
create policy "bank_rules_insert" on bank_rules for insert with check (is_org_admin(org_id));
create policy "bank_rules_update" on bank_rules for update using (is_org_admin(org_id));
create policy "bank_rules_delete" on bank_rules for delete using (is_org_admin(org_id));

-- naming_rules
create policy "naming_rules_select" on naming_rules for select using (is_org_member(org_id));
create policy "naming_rules_insert" on naming_rules for insert with check (is_org_admin(org_id));
create policy "naming_rules_update" on naming_rules for update using (is_org_admin(org_id));
create policy "naming_rules_delete" on naming_rules for delete using (is_org_admin(org_id));

-- filing_flows
create policy "filing_flows_select" on filing_flows for select using (is_org_member(org_id));
create policy "filing_flows_insert" on filing_flows for insert with check (is_org_admin(org_id));
create policy "filing_flows_update" on filing_flows for update using (is_org_admin(org_id));
create policy "filing_flows_delete" on filing_flows for delete using (is_org_admin(org_id));

-- rules_engine
create policy "rules_select" on rules_engine for select using (is_org_member(org_id));
create policy "rules_insert" on rules_engine for insert with check (is_org_admin(org_id));
create policy "rules_update" on rules_engine for update using (is_org_admin(org_id));
create policy "rules_delete" on rules_engine for delete using (is_org_admin(org_id));

-- supplier_aliases
create policy "aliases_select" on supplier_aliases for select using (is_org_member(org_id));
create policy "aliases_insert" on supplier_aliases for insert with check (is_org_admin(org_id));
create policy "aliases_update" on supplier_aliases for update using (is_org_admin(org_id));
create policy "aliases_delete" on supplier_aliases for delete using (is_org_admin(org_id));

-- extraction_prompts
create policy "prompts_select" on extraction_prompts for select using (is_org_member(org_id));
create policy "prompts_insert" on extraction_prompts for insert with check (is_org_admin(org_id));
create policy "prompts_update" on extraction_prompts for update using (is_org_admin(org_id));
create policy "prompts_delete" on extraction_prompts for delete using (is_org_admin(org_id));

-- invitations
create policy "invitations_select" on invitations for select using (is_org_member(org_id));
create policy "invitations_insert" on invitations for insert with check (is_org_admin(org_id));
create policy "invitations_delete" on invitations for delete using (is_org_admin(org_id));

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on new user signup
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- handle_new_user is a trigger fn only; no one should call it via RPC
revoke execute on function handle_new_user() from anon, authenticated;

-- updated_at maintenance
create or replace function update_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger invoices_updated_at before update on invoices
  for each row execute function update_updated_at();

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();
