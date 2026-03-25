-- Create audit table for contractor pricing updates.
-- Run in Supabase SQL editor.

create table if not exists public.pricing_change_log (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  source text not null default 'manual',
  file_name text,
  rows_saved integer not null default 0,
  inserted_rows integer not null default 0,
  updated_rows integer not null default 0,
  unchanged_rows integer not null default 0,
  changed_at timestamptz not null default now(),
  change_summary jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pricing_change_log_contractor_idx
  on public.pricing_change_log (contractor_id, changed_at desc);

-- Optional RLS policy examples (adjust to your auth model):
-- alter table public.pricing_change_log enable row level security;
-- create policy "service role can write pricing logs"
--   on public.pricing_change_log
--   for insert
--   using (auth.role() = 'service_role')
--   with check (auth.role() = 'service_role');
