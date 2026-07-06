-- =============================================================================
-- Sistema de Salones — Productos vendibles / internos
-- =============================================================================
-- Agrega is_sellable para distinguir productos vendibles en POS de insumos internos

alter table public.products
  add column if not exists is_sellable boolean not null default true;

create index if not exists products_sellable_idx
  on public.products(business_id, is_sellable)
  where is_sellable = true;

comment on column public.products.is_sellable is
  'Indica si el producto está disponible para venta en POS. Los productos internos del salón (insumos) deben tener is_sellable = false.';
