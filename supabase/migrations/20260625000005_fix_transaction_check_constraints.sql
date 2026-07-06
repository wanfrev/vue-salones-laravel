-- =============================================================================
-- Drop old unnamed check constraints on transactions that don't include
-- assistant_amount/assistant_percentage.
--
-- Bug: The init schema created inline CHECK constraints without explicit names:
--   check (round(local_amount + employee_amount, 2) = round(total_amount, 2))
--   check (round(local_percentage + employee_percentage, 2) = 100)
--
-- The assistant migration (20260619000000) tried to drop them with wrong names:
--   drop constraint if exists transactions_local_plus_employee_equals_total
--   drop constraint if exists transactions_local_percentage_plus_employee_equals_100
--
-- These DROPs silently did nothing. The old constraints remained alongside
-- the new ones, causing "transactions_check" violations whenever an
-- appointment with assistant_percentage > 0 was charged.
-- =============================================================================

do $$
declare
  rec record;
begin
  for rec in
    select conname
    from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and contype = 'c'
      and conname not in (
        'transactions_local_employee_assistant_equal_total',
        'transactions_percentages_sum_100'
      )
  loop
    execute format('alter table public.transactions drop constraint if exists %I', rec.conname);
  end loop;
end;
$$;
