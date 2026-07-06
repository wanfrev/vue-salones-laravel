-- Add punto_venta payment method (Punto de venta / Tarjeta en bolívares)
alter type public.payment_method add value if not exists 'punto_venta';
