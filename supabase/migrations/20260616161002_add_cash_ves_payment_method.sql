-- Add cash_ves payment method (Efectivo en bolívares)
alter type public.payment_method add value if not exists 'cash_ves';
