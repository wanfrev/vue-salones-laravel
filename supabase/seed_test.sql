INSERT INTO inventory_locations (id, business_id, name, is_default)
VALUES (gen_random_uuid(), '5486f5bf-4483-49d5-82be-e2b5d61001d2', 'Principal', true)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  p RECORD;
  loc UUID;
BEGIN
  SELECT id INTO loc FROM inventory_locations
  WHERE business_id = '5486f5bf-4483-49d5-82be-e2b5d61001d2' AND is_default = true LIMIT 1;

  FOR p IN SELECT id FROM products WHERE business_id = '5486f5bf-4483-49d5-82be-e2b5d61001d2' LOOP
    INSERT INTO inventory_stock (id, business_id, location_id, product_id, quantity)
    VALUES (gen_random_uuid(), '5486f5bf-4483-49d5-82be-e2b5d61001d2', loc, p.id, 20);
  END LOOP;
END $$;
