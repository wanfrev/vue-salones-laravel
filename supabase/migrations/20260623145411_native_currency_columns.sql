-- =============================================================================
-- Native currency columns to replace [VES:...] / [USD:...] anti-pattern in notes
-- =============================================================================
-- Problem: currency data was embedded as text prefixes in the notes column:
--   expenses.notes        → '[VES:500:40.5] Compra de insumos'
--   employee_payments.notes → '[VES:4000] Pago quincenal'
--   supplier_payments already has native columns (this migration matches that pattern)
--
-- Solution: add native numeric columns so PostgreSQL can filter/sum/aggregate
-- without expensive regex parsing of text at query time.

-- 1. expenses
alter table public.expenses
  add column if not exists currency            text            not null default 'USD',
  add column if not exists original_amount      numeric(12, 2)  not null default 0,
  add column if not exists exchange_rate_used   numeric(12, 4)  not null default 1.0000;

comment on column public.expenses.currency is 'USD | VES';
comment on column public.expenses.original_amount is 'Monto original si currency=VES, sino 0';
comment on column public.expenses.exchange_rate_used is 'Tasa usada al momento de registrar el gasto';

-- 2. employee_payments
alter table public.employee_payments
  add column if not exists currency            text            not null default 'USD',
  add column if not exists original_amount      numeric(12, 2)  not null default 0,
  add column if not exists exchange_rate_used   numeric(12, 4)  not null default 1.0000;

comment on column public.employee_payments.currency is 'USD | VES';
comment on column public.employee_payments.original_amount is 'Monto original si currency=VES, sino 0';
comment on column public.employee_payments.exchange_rate_used is 'Tasa usada al momento del pago';

-- 3. Backfill existing data from notes column
--    Two formats exist in the wild:
--      New: [VES:amount:rate]         → expenses (rate stored explicitly)
--      Old: [VES:amount]              → expenses (rate derived from USD total)
--           [VES:amount] or [USD:amount] → employee_payments

-- 3a. expenses — format [VES:amount:rate] (with explicit rate)
update public.expenses
set
  currency = 'VES',
  original_amount = (regexp_match(notes, '^\[VES:(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)\]'))[1]::numeric,
  exchange_rate_used = coalesce((regexp_match(notes, '^\[VES:(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)\]'))[2]::numeric, 1),
  notes = regexp_replace(notes, '^\[VES:\d+(?:\.\d+)?:\d+(?:\.\d+)?\]\s?', '')
where notes ~ '^\[VES:\d+(?:\.\d+)?:\d+(?:\.\d+)?\]';

-- 3b. expenses — format [VES:amount] (old format, no rate → derive from amount)
update public.expenses
set
  currency = 'VES',
  original_amount = (regexp_match(notes, '^\[VES:(\d+(?:\.\d+)?)\]'))[1]::numeric,
  exchange_rate_used = case
    when amount > 0 then (regexp_match(notes, '^\[VES:(\d+(?:\.\d+)?)\]'))[1]::numeric / amount
    else 1
  end,
  notes = regexp_replace(notes, '^\[VES:\d+(?:\.\d+)?\]\s?', '')
where notes ~ '^\[VES:\d+(?:\.\d+)?\]'
  and notes !~ '^\[VES:\d+(?:\.\d+)?:\d+(?:\.\d+)?\]';

-- 3c. employee_payments — format [VES:amount]
update public.employee_payments
set
  currency = 'VES',
  original_amount = (regexp_match(notes, '^\[VES:(\d+(?:\.\d+)?)\]'))[1]::numeric,
  exchange_rate_used = case
    when amount > 0 then (regexp_match(notes, '^\[VES:(\d+(?:\.\d+)?)\]'))[1]::numeric / amount
    else 1
  end,
  notes = regexp_replace(notes, '^\[VES:\d+(?:\.\d+)?\]\s?', '')
where notes ~ '^\[VES:';

-- 3d. employee_payments — format [USD:amount]
update public.employee_payments
set
  currency = 'USD',
  original_amount = (regexp_match(notes, '^\[USD:(\d+(?:\.\d+)?)\]'))[1]::numeric,
  notes = regexp_replace(notes, '^\[USD:\d+(?:\.\d+)?\]\s?', '')
where notes ~ '^\[USD:';
