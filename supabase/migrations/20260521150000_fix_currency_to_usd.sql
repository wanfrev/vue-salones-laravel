-- Cambiar moneda de todos los negocios existentes a USD.
update public.businesses set currency = 'USD' where currency != 'USD';
