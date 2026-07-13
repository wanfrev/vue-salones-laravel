-- VENTAS DE PRODUCTOS (inventory_movements)
-- Resuelve product_id por name, location_id por default, branch_id via appointment si tiene referencia.

WITH data(id, notes, created_at, exchange_rate, quantity, unit_cost, reference_type, reference_id, product_name) AS (
  VALUES
    ('81d0286f-d4c4-4af3-a439-aeee046e4223'::uuid, '[VES:825] ref 8406', '2026-07-11 14:44:39+00'::timestamptz, 825.00, -1.00, 2.00, NULL, NULL, 'Cafe capuccino'),
    ('6abf6201-1658-4d82-b8d2-01e5e0eee5f2'::uuid, '[VES:825] ref 4834', '2026-07-11 14:44:00+00'::timestamptz, 825.00, -1.00, 2.00, NULL, NULL, 'Cafe capuccino'),
    ('0ba81848-fe77-404d-931d-f2b32e8e474d'::uuid, 'PAMELA BRICEÑO', '2026-07-10 15:50:50+00'::timestamptz, 818.00, -1.00, 3.00, NULL, NULL, 'Aceite Cuccio'),
    ('1a6ef712-7019-4dfc-a35c-1d6ef6435a7d'::uuid, 'POS Venta directa zelle', '2026-07-09 19:22:46+00'::timestamptz, 820.00, -1.00, 6.00, NULL, NULL, 'Empanada yuca con carne mechada'),
    ('93a38780-d001-4895-9d9b-2dda2b260174'::uuid, 'Se lo comio la jefecita', '2026-07-09 14:51:02+00'::timestamptz, 820.00, -1.00, 6.00, NULL, NULL, 'Tequenos integrales'),
    ('59c0fc40-45be-4d5d-abde-4b9e5313317e'::uuid, '[VES:790] ref 8897', '2026-07-08 21:08:46+00'::timestamptz, 790.00, -2.00, 2.00, NULL, NULL, 'platanito'),
    ('2ee2aa93-9440-4c48-9602-7a3b7da331fb'::uuid, 'transfiere cloraldo leal', '2026-07-08 14:54:07+00'::timestamptz, 790.00, -1.00, 5.00, NULL, NULL, 'Tequeno de platano'),
    ('4e5a6810-7b02-4851-9104-386702435957'::uuid, 'POS Venta directa cash', '2026-07-08 03:07:52+00'::timestamptz, 742.00, -1.00, 2.00, NULL, NULL, 'sandalias de foami'),
    ('4dac7a30-1570-44fa-b055-a6cc9c0d10ff'::uuid, 'Venta punto de venta', '2026-07-07 16:19:45+00'::timestamptz, 1.00, -1.00, 1.00, 'appointment', '048af672-240f-4309-a827-bd3d0622fdab'::uuid, 'Cafe nocciolino'),
    ('ef29a043-fd24-4492-a0ff-4280a9c85fb6'::uuid, '[VES:730] ref 0288', '2026-07-02 18:04:00+00'::timestamptz, 730.00, -1.00, 2.00, NULL, NULL, 'platanito')
)
INSERT INTO inventory_movements (id, business_id, branch_id, location_id, product_id, variant_id, movement_type, quantity, unit_cost, exchange_rate_used, reference_type, reference_id, notes, created_by, client_id, created_at)
SELECT
  d.id,
  b.id,
  COALESCE(a.branch_id, (SELECT id FROM branches WHERE business_id = b.id ORDER BY is_default DESC LIMIT 1)),
  (SELECT id FROM inventory_locations WHERE business_id = b.id LIMIT 1),
  p.id,
  NULL,
  'sale',
  d.quantity,
  d.unit_cost,
  d.exchange_rate,
  d.reference_type,
  d.reference_id,
  d.notes,
  NULL,
  NULL,
  d.created_at
FROM data d
CROSS JOIN (SELECT '030ec84b-fa6f-41f7-9ae0-1e191967159e'::uuid AS id) b
LEFT JOIN appointments a ON d.reference_type = 'appointment' AND a.id = d.reference_id
JOIN products p ON p.business_id = b.id AND p.name = d.product_name
ON CONFLICT (id) DO NOTHING;
