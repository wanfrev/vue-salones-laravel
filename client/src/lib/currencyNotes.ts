export interface CurrencyNotes {
  currency: 'USD' | 'VES'
  originalAmount: number
  exchangeRateUsed: number
  cleanNotes: string
}

export function encodeExpenseNotes(amount: number, currency: 'USD' | 'VES', exchangeRate: number, userNotes: string): string {
  if (currency !== 'VES') return userNotes
  const rate = exchangeRate && exchangeRate > 0 ? exchangeRate : 1
  const prefix = `[VES:${amount}:${rate}]`
  return userNotes ? `${prefix} ${userNotes}` : prefix
}

export function encodeEmployeePaymentNotes(amount: number, currency: 'USD' | 'VES', userNotes: string): string {
  const prefix = `[${currency}:${amount}]`
  return userNotes ? `${prefix} ${userNotes}` : prefix
}

export function encodeInventorySaleNotes(exchangeRate: number, userNotes: string): string {
  const prefix = `[VES:${exchangeRate}]`
  return `${prefix} ${userNotes || 'Venta directa'}`
}

export function getSaleCurrencyFromNotes(movementNotes: string | undefined, defaultRate: number, isVES: boolean): {
  currency: 'USD' | 'VES'
  exchangeRateUsed: number
} {
  if (!isVES) return { currency: 'USD', exchangeRateUsed: defaultRate || 1 }
  const rate = defaultRate || 1
  const notes = movementNotes ?? ''
  const vesMatch = notes.match(/^\[VES:(\d+(?:\.\d+)?)\]/)
  if (vesMatch) {
    const parsedRate = Number(vesMatch[1])
    return { currency: 'VES', exchangeRateUsed: parsedRate > 0 ? parsedRate : rate }
  }
  return { currency: 'VES', exchangeRateUsed: rate }
}

export function decodeCurrencyNotes(rawNotes: string, storedAmount: number): CurrencyNotes {
  const notes = rawNotes ?? ''

  const newVesMatch = notes.match(/^\[VES:(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)\]\s?(.*)/s)
  if (newVesMatch) {
    return {
      currency: 'VES',
      originalAmount: Number(newVesMatch[1]),
      exchangeRateUsed: Number(newVesMatch[2]),
      cleanNotes: newVesMatch[3] || '',
    }
  }

  const oldVesMatch = notes.match(/^\[VES:(\d+(?:\.\d+)?)\]\s?(.*)/s)
  if (oldVesMatch) {
    const originalAmount = Number(oldVesMatch[1])
    const exchangeRateUsed = storedAmount > 0 ? originalAmount / storedAmount : 1
    return {
      currency: 'VES',
      originalAmount,
      exchangeRateUsed,
      cleanNotes: oldVesMatch[2] || '',
    }
  }

  const usdMatch = notes.match(/^\[USD:(\d+(?:\.\d+)?)\]\s?(.*)/s)
  if (usdMatch) {
    return {
      currency: 'USD',
      originalAmount: Number(usdMatch[1]),
      exchangeRateUsed: 1,
      cleanNotes: usdMatch[2] || '',
    }
  }

  return {
    currency: 'USD',
    originalAmount: storedAmount,
    exchangeRateUsed: 1,
    cleanNotes: notes,
  }
}
