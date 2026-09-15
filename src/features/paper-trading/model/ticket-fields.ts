import { roundCash, roundQty } from './engine'

export type TicketDriver = 'qty' | 'amount'

export type TicketFields = {
  qty: string
  amount: string
  driver: TicketDriver
}

export type TicketFieldAction =
  | { type: 'qty'; value: string; limit: number }
  | { type: 'amount'; value: string; limit: number }
  | { type: 'limit'; limit: number }

export function parseTicketNumber(raw: string): number | null {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) {
    return null
  }

  return value
}

export function formatTicketQty(value: number): string {
  return trimTrailingZeros(roundQty(value).toFixed(8))
}

export function formatTicketAmount(value: number): string {
  return trimTrailingZeros(roundCash(value).toFixed(2))
}

export function deriveAmount(qtyRaw: string, limit: number): string | null {
  const qty = parseTicketNumber(qtyRaw)
  if (qty === null || !isPositiveLimit(limit)) {
    return null
  }

  return formatTicketAmount(qty * limit)
}

export function deriveQty(amountRaw: string, limit: number): string | null {
  const amount = parseTicketNumber(amountRaw)
  if (amount === null || !isPositiveLimit(limit)) {
    return null
  }

  const qty = roundQty(amount / limit)
  if (qty <= 0) {
    return null
  }

  return formatTicketQty(qty)
}

export function nextTicketFields(fields: TicketFields, action: TicketFieldAction): TicketFields {
  if (action.type === 'qty') {
    return {
      driver: 'qty',
      qty: action.value,
      amount: deriveAmount(action.value, action.limit) ?? fields.amount,
    }
  }

  if (action.type === 'amount') {
    return {
      driver: 'amount',
      amount: action.value,
      qty: deriveQty(action.value, action.limit) ?? fields.qty,
    }
  }

  if (fields.driver === 'qty') {
    return {
      ...fields,
      amount: deriveAmount(fields.qty, action.limit) ?? fields.amount,
    }
  }

  return {
    ...fields,
    qty: deriveQty(fields.amount, action.limit) ?? fields.qty,
  }
}

export function maxBuyNotional(cash: number, fee: number): number {
  if (!Number.isFinite(cash) || cash <= 0 || !Number.isFinite(fee) || fee < 0) {
    return 0
  }

  return roundCash(cash / (1 + fee))
}

export function canAffordBuy(qty: number, limit: number, cash: number, fee: number): boolean {
  if (!Number.isFinite(qty) || qty <= 0) {
    return true
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    return true
  }

  if (!Number.isFinite(cash) || !Number.isFinite(fee) || fee < 0) {
    return true
  }

  return roundCash(roundQty(qty) * limit * (1 + fee)) <= cash + 1e-9
}

export function qtyForMaxBuy(cash: number, limit: number, fee: number): number {
  if (!Number.isFinite(cash) || cash <= 0) {
    return 0
  }

  if (!isPositiveLimit(limit) || !Number.isFinite(fee) || fee < 0) {
    return 0
  }

  const factor = limit * (1 + fee)
  const fits = (qty: number) => roundCash(qty * factor) <= cash + 1e-9

  let lo = 0
  let hi = Math.floor((cash / factor) * 1e8) + 2

  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2)
    if (fits(mid / 1e8)) {
      lo = mid
    } else {
      hi = mid - 1
    }
  }

  return lo / 1e8
}

function isPositiveLimit(limit: number): boolean {
  return Number.isFinite(limit) && limit > 0
}

function trimTrailingZeros(value: string): string {
  if (!value.includes('.')) {
    return value
  }

  return value.replace(/\.?0+$/, '')
}
