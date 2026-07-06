export function validateSaleQuantity(quantity: number, availableQty: number): void {
  if (quantity <= 0) throw new Error('La cantidad debe ser mayor a 0')
  if (quantity > availableQty) throw new Error('Stock insuficiente')
}

export function validateAdjustQuantity(quantity: number): void {
  if (quantity === 0) throw new Error('La cantidad de ajuste no puede ser 0')
}

export function movementTypeForAdjust(quantity: number): 'purchase' | 'adjustment' {
  return quantity > 0 ? 'purchase' : 'adjustment'
}
