-- =============================================================================
-- Add Multicurrency and Mixed Payments Support
-- =============================================================================

-- Add VES exchange rate to businesses
alter table public.businesses
  add column if not exists ves_exchange_rate numeric(12, 4) not null default 36.5000;

-- Expand payment methods
alter type public.payment_method add value if not exists 'zelle';
alter type public.payment_method add value if not exists 'pago_movil';
alter type public.payment_method add value if not exists 'mixed';

-- Add snapshot of the exchange rate used and a JSON breakdown for mixed payments
alter table public.transactions
  add column if not exists exchange_rate_used numeric(12, 4) not null default 1.0000,
  add column if not exists payments_breakdown jsonb not null default '[]'::jsonb;
