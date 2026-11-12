-- fence-quote-app database schema
--
-- Run this in the Supabase SQL editor of a NEW project (Dashboard → SQL Editor → New query).
-- It is safe to re-run: tables use "if not exists" and policies are dropped and recreated.
--
-- This file was reconstructed from how the app reads and writes the database, because the
-- original table definitions were not in the repository. If you already have a Supabase
-- project that the app has been using, compare it with PART 1 before running it, and run
-- PART 2 (security) either way.
--
-- How access works after this script:
--   * The server (API routes, /admin) uses the service-role key, which bypasses row-level security.
--   * The public browser key (anon) can ONLY read active contractors (four columns) and their
--     active pricing. It can't read emails, setup tokens or webhook URLs, and it can't read or
--     write quote submissions, pricing changes, or anything else.

-- ═════════════════════════════════════════════════════════════════════════════
-- PART 1: Tables
-- ═════════════════════════════════════════════════════════════════════════════

create table if not exists public.contractors (
  id                       uuid primary key default gen_random_uuid(),
  slug                     text not null unique
                             check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 48),
  company_name             text not null,
  email                    text,
  phone                    text,
  -- The quote form only works for contractors whose status is exactly 'active'.
  subscription_status      text not null default 'inactive',
  -- Secret that lets a contractor open their pricing setup page. Treat like a password.
  edit_token               text unique,
  crm_type                 text,
  crm_webhook_url          text,
  embed_enabled            boolean not null default true,
  -- Comma-separated list of sites allowed to embed this contractor's form.
  iframe_parent_origins    text,
  require_embed_signature  boolean not null default false,
  brand_primary_color      text,
  brand_secondary_color    text,
  created_at               timestamptz not null default now()
);

create table if not exists public.contractor_pricing (
  id                         uuid primary key default gen_random_uuid(),
  contractor_id              uuid not null references public.contractors(id) on delete cascade,
  fence_type                 text not null check (fence_type in ('cedar', 'vinyl', 'chain-link', 'aluminum')),
  fence_height               text not null check (fence_height in ('4', '6', '8')),
  price_per_foot             numeric not null check (price_per_foot >= 0),
  grade_multiplier_flat      numeric not null check (grade_multiplier_flat >= 0),
  grade_multiplier_moderate  numeric not null check (grade_multiplier_moderate >= 0),
  grade_multiplier_steep     numeric not null check (grade_multiplier_steep >= 0),
  gate_price                 numeric not null check (gate_price >= 0),
  tear_out_fee               numeric not null check (tear_out_fee >= 0),
  minimum_job_price          numeric not null check (minimum_job_price >= 0),
  estimate_high_multiplier   numeric not null check (estimate_high_multiplier >= 0),
  is_active                  boolean not null default true,
  created_at                 timestamptz not null default now(),
  -- The pricing editor saves with "on conflict (contractor_id, fence_type, fence_height)".
  unique (contractor_id, fence_type, fence_height)
);

create index if not exists contractor_pricing_contractor_idx
  on public.contractor_pricing (contractor_id);

create table if not exists public.quote_submissions (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  customer_name      text not null,
  customer_email     text not null,
  customer_phone     text not null,
  address            text not null,
  street_address     text,
  city               text,
  state              text,
  zip                text,
  fence_type         text not null,
  fence_height       text not null,
  yard_grade         text not null,
  linear_feet        numeric not null,
  gates              integer not null default 0,
  tear_out           boolean not null default false,
  contractor_id      uuid not null references public.contractors(id) on delete cascade,
  contractor_name    text,
  estimate_low       numeric not null,
  estimate_high      numeric not null,
  estimate_subtotal  numeric,
  estimate_total     numeric,
  status             text not null default 'new'
                       check (status in ('new', 'contacted', 'quoted', 'won', 'lost')),
  -- Duplicates of the customer_* columns; the app writes both.
  name               text,
  email              text,
  phone              text,
  lead_source        text,
  internal_notes     text
);

create index if not exists quote_submissions_contractor_created_idx
  on public.quote_submissions (contractor_id, created_at desc);

-- Audit trail of pricing edits (also kept in PRICING_CHANGE_LOG.sql).
create table if not exists public.pricing_change_log (
  id               uuid primary key default gen_random_uuid(),
  contractor_id    uuid not null references public.contractors(id) on delete cascade,
  source           text not null default 'manual',
  file_name        text,
  rows_saved       integer not null default 0,
  inserted_rows    integer not null default 0,
  updated_rows     integer not null default 0,
  unchanged_rows   integer not null default 0,
  changed_at       timestamptz not null default now(),
  change_summary   jsonb not null default '{}'::jsonb,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists pricing_change_log_contractor_idx
  on public.pricing_change_log (contractor_id, changed_at desc);

-- ═════════════════════════════════════════════════════════════════════════════
-- PART 2: Security (row-level security + minimal public access)
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.contractors         enable row level security;
alter table public.contractor_pricing  enable row level security;
alter table public.quote_submissions   enable row level security;
alter table public.pricing_change_log  enable row level security;

-- Start from "no access" for the public browser roles on every table.
revoke all on table public.contractors         from anon, authenticated;
revoke all on table public.contractor_pricing  from anon, authenticated;
revoke all on table public.quote_submissions   from anon, authenticated;
revoke all on table public.pricing_change_log  from anon, authenticated;

-- The quote form looks a contractor up by slug or id. Only these four columns are readable
-- (so email, phone, edit_token and webhook URL stay private), and only for active contractors.
grant select (id, slug, company_name, subscription_status)
  on public.contractors to anon, authenticated;

drop policy if exists "public can read active contractors" on public.contractors;
create policy "public can read active contractors"
  on public.contractors
  for select
  to anon, authenticated
  using (subscription_status = 'active');

-- The quote form loads the pricing options for an active contractor.
grant select on public.contractor_pricing to anon, authenticated;

drop policy if exists "public can read active pricing" on public.contractor_pricing;
create policy "public can read active pricing"
  on public.contractor_pricing
  for select
  to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.contractors c
      where c.id = contractor_pricing.contractor_id
        and c.subscription_status = 'active'
    )
  );

-- quote_submissions and pricing_change_log have no public policies on purpose:
-- only the server (service-role key) can read or write them.

-- ═════════════════════════════════════════════════════════════════════════════
-- Handy commands (run one at a time when you need them)
-- ═════════════════════════════════════════════════════════════════════════════
--
-- Turn a contractor on or off (use this to start or stop a paying customer):
--   update public.contractors set subscription_status = 'active'   where slug = 'their-slug';
--   update public.contractors set subscription_status = 'inactive' where slug = 'their-slug';
