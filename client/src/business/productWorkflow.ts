import { db } from "../lib/api";

export async function ensureDefaultLocation(
  businessId: string,
  branchId?: string | null,
): Promise<{ id: string }> {
  let query = db
    .from("inventory_locations")
    .select("id")
    .eq("business_id", businessId)
    .eq("is_default", true);

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  let { data: loc } = await query.maybeSingle();

  if (!loc) {
    let firstQuery = db
      .from("inventory_locations")
      .select("id")
      .eq("business_id", businessId);

    if (branchId) {
      firstQuery = firstQuery.eq("branch_id", branchId);
    }

    const { data: firstLoc } = await firstQuery.limit(1).maybeSingle();
    loc = firstLoc;
  }

  if (!loc) {
    const { data: newLoc, error: insertErr } = await db
      .from("inventory_locations")
      .insert({
        business_id: businessId,
        branch_id: branchId ?? null,
        name: "Principal",
        is_default: true,
      })
      .select("id")
      .single();
    if (insertErr) {
      // La migracion 2026_07_12_000000 reemplazo la unique key global original
      // (inventory_locations_business_id_name_key) por dos indices parciales -- uno por
      // sucursal (inventory_locations_unique_branch_idx) y uno global para negocios sin
      // sucursales (inventory_locations_unique_global_idx). Sin reconocer los nombres nuevos,
      // una carrera real (dos productos creados casi al mismo tiempo en una sucursal que aun
      // no tiene su ubicacion "Principal") ya no se recuperaba aqui -- el error subia intacto
      // y saveProducto() lo tragaba en silencio, dejando el producto creado sin stock.
      const isDuplicate = /inventory_locations_(business_id_name_key|unique_branch_idx|unique_global_idx)/.test(insertErr.message)
      if (isDuplicate && branchId) {
        const { data: existingLoc } = await db
          .from("inventory_locations")
          .select("id")
          .eq("business_id", businessId)
          .eq("name", "Principal")
          .maybeSingle();
        loc = existingLoc;
      }
      if (!loc) {
        console.error(
          "[ensureDefaultLocation] error creating location:",
          insertErr,
        );
        throw new Error(
          insertErr.message || "Error al crear ubicación de inventario",
        );
      }
    } else {
      loc = newLoc;
    }
  }

  if (!loc?.id) {
    throw new Error(
      "No se pudo crear ni encontrar una ubicación de inventario para esta sucursal",
    );
  }

  return loc;
}

export async function createInitialStock(
  businessId: string,
  productId: string,
  locationId: string,
  quantity: number,
  branchId?: string | null,
  variantId?: string | null,
): Promise<void> {
  const { error } = await db.from("inventory_stock").insert({
    business_id: businessId,
    branch_id: branchId ?? null,
    location_id: locationId,
    product_id: productId,
    variant_id: variantId ?? null,
    quantity: Math.max(0, Number(quantity)),
  });

  if (error) {
    console.error("[createInitialStock]", error);
    throw error;
  }
}
