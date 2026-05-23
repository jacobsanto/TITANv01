-- ============================================================
-- 1. organizations
-- ============================================================
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'pro', 'enterprise')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  docs_used_this_month integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. profiles
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  avatar_url text,
  locale text default 'el',
  theme text default 'system' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 3. organization_members
-- ============================================================
create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('super_admin', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- ============================================================
-- 4. config_snapshots
-- ============================================================
create table if not exists config_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null default 'Initial Setup',
  is_active boolean not null default false,
  snapshot jsonb,
  created_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. user_settings
-- ============================================================
create table if not exists user_settings (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  setup_id uuid references config_snapshots(id) on delete set null,
  setting_key text not null,
  setting_value text,
  updated_at timestamptz not null default now(),
  primary key (org_id, user_id, setting_key)
);

-- ============================================================
-- 6. companies
-- ============================================================
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  setup_id uuid references config_snapshots(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  afm text,
  drive_folder_id text,
  is_active boolean default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 7. invoices
-- ============================================================
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  setup_id uuid references config_snapshots(id) on delete set null,
  company_id uuid references companies(id) on delete set null,
  invoice_number text,
  mark_number text,
  issuer text,
  recipient text,
  document_type text,
  source text,
  currency text default 'EUR',
  payment_method text,
  net_amount numeric(15,2),
  vat_amount numeric(15,2),
  total_amount numeric(15,2),
  withheld_tax numeric(15,2),
  status text not null default 'pending' check (status in ('filed', 'pending', 'error', 'processing', 'skipped')),
  confidence float8,
  needs_review boolean not null default false,
  drive_url text,
  original_filename text,
  new_filename text,
  filing_path text,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 8. bank_docs
-- ============================================================
create table if not exists bank_docs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  setup_id uuid references config_snapshots(id) on delete set null,
  company_id uuid references companies(id) on delete set null,
  invoice_id uuid references invoices(id) on delete set null,
  description text,
  amount numeric(15,2),
  net_amount numeric(15,2),
  vat_amount numeric(15,2),
  tx_type text,
  payment_method text,
  currency text default 'EUR',
  status text not null default 'pending' check (status in ('pending', 'matched', 'unmatched', 'error')),
  needs_review boolean not null default false,
  drive_url text,
  original_filename text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 9. skipped_docs
-- ============================================================
create table if not exists skipped_docs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  setup_id uuid references config_snapshots(id) on delete set null,
  company_id uuid references companies(id) on delete set null,
  original_filename text,
  reason text,
  drive_url text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 10. job_runs
-- ============================================================
create table if not exists job_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  job_type text not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 11. processing_queue
-- ============================================================
create table if not exists processing_queue (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  error_message text
);

-- ============================================================
-- 12. audit_log
-- ============================================================
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  action text not null,
  user_id uuid references auth.users(id) on delete set null,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 13. system_flags
-- ============================================================
create table if not exists system_flags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  flag_type text not null,
  severity text not null default 'info' check (severity in ('critical', 'warning', 'info')),
  entity_type text,
  entity_id uuid,
  message text not null,
  details jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 14. bank_rules
-- ============================================================
create table if not exists bank_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  setup_id uuid not null references config_snapshots(id) on delete cascade,
  account_last8 text,
  bank_name text,
  account_type text,
  iban text,
  rule_type text not null default 'match' check (rule_type in ('match', 'exclude', 'auto_file')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 15. naming_rules
-- ============================================================
create table if not exists naming_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  setup_id uuid not null references config_snapshots(id) on delete cascade,
  rule_type text not null,
  pattern_template text not null,
  prefix text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 16. filing_flows
-- ============================================================
create table if not exists filing_flows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  setup_id uuid not null references config_snapshots(id) on delete cascade,
  flow_type text not null,
  path_template text not null,
  conditions jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 17. rules_engine
-- ============================================================
create table if not exists rules_engine (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  setup_id uuid not null references config_snapshots(id) on delete cascade,
  name text not null,
  rule_type text not null check (rule_type in ('classification', 'routing', 'validation', 'enrichment')),
  conditions jsonb,
  action text not null,
  priority integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 18. supplier_aliases
-- ============================================================
create table if not exists supplier_aliases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  setup_id uuid not null references config_snapshots(id) on delete cascade,
  canonical_name text not null,
  alias_name text not null,
  afm text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 19. extraction_prompts
-- ============================================================
create table if not exists extraction_prompts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  setup_id uuid not null references config_snapshots(id) on delete cascade,
  prompt_type text not null,
  prompt_text text not null,
  valid_from timestamptz,
  valid_until timestamptz,
  superseded_by uuid references extraction_prompts(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 20. invitations
-- ============================================================
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);
