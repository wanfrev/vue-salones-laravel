-- Separate exchange rate for employee payments.
-- When NULL, employee views use the normal global rate (current behavior).
-- When set, employee receipts/commissions use this rate to convert USD→Bs.
alter table public.businesses
  add column if not exists employee_ves_rate numeric(12, 4);
