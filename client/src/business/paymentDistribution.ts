export interface GroupTxInput {
  id: string
  totalAmount: number
  tipAmount: number
}

export interface AllocatedTx {
  id: string
  serviceAmount: number
  tip: number
  newTotal: number
}

function toServiceRows(txs: GroupTxInput[]) {
  return txs.map(tx => {
    const tip = Math.max(0, tx.tipAmount)
    const serviceAmount = Math.max(0, tx.totalAmount - tip)
    return { id: tx.id, tip, serviceAmount }
  })
}

export function distributeGroupPayment(
  transactions: GroupTxInput[],
  desiredServiceTotal: number,
): AllocatedTx[] {
  if (transactions.length === 0) return []

  const rows = toServiceRows(transactions)
  const currentTotal = rows.reduce((sum, r) => sum + r.serviceAmount, 0)

  if (currentTotal <= 0) {
    const equal = Number((desiredServiceTotal / rows.length).toFixed(2))
    return rows.map(r => ({
      id: r.id,
      serviceAmount: 0,
      tip: r.tip,
      newTotal: Number((equal + r.tip).toFixed(2)),
    }))
  }

  const total = desiredServiceTotal > 0 ? desiredServiceTotal : currentTotal

  let allocated = 0
  const planned = rows.map((row, idx) => {
    if (idx === rows.length - 1) {
      const remaining = Number((total - allocated).toFixed(2))
      return { ...row, newServiceAmount: Math.max(0.01, remaining) }
    }

    const ratio = row.serviceAmount / currentTotal
    const share = Number((total * ratio).toFixed(2))
    allocated += share
    return { ...row, newServiceAmount: Math.max(0.01, share) }
  })

  const normalized = planned.reduce((sum, r) => sum + r.newServiceAmount, 0)
  const drift = Number((total - normalized).toFixed(2))

  if (drift !== 0 && planned.length > 0) {
    planned[0].newServiceAmount = Number(
      (planned[0].newServiceAmount + drift).toFixed(2)
    )
  }

  return planned.map(r => ({
    id: r.id,
    serviceAmount: r.serviceAmount,
    tip: r.tip,
    newTotal: Number((r.newServiceAmount + r.tip).toFixed(2)),
  }))
}
