-- Fix: transactions delete policy should allow admins, not just superadmins
-- Without this, regular admins get a success message but the DELETE is silently blocked by RLS
drop policy if exists transactions_delete on public.transactions;
create policy transactions_delete on public.transactions
  for delete to authenticated
  using (public.is_superadmin() or public.is_admin_of(business_id));
