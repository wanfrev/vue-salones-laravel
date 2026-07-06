-- Add type and concept columns to employee_payments
-- type = 'payment' for salary/comission payments, 'consumption' for service/product debits
-- concept = free text describing what the employee consumed

alter table employee_payments
  add column if not exists type text not null default 'payment',
  add column if not exists concept text;
