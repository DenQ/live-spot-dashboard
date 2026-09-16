import type { PaperAccount } from './types'

const QTY_EPS = 1e-8

export type LastOpenBuy = {
  price: number
  at: number | null
}

export function lastOpenBuy(account: PaperAccount, instrumentId: string): LastOpenBuy | null {
  const position = account.positions[instrumentId]

  if (!position || position.qty <= QTY_EPS) {
    return null
  }

  const entry = account.ledger.find(
    (item) =>
      item.instrumentId === instrumentId &&
      item.side === 'buy' &&
      item.status === 'filled' &&
      item.fillPrice != null,
  )

  if (entry?.fillPrice != null) {
    return { price: entry.fillPrice, at: entry.at }
  }

  return Number.isFinite(position.avgPrice) ? { price: position.avgPrice, at: null } : null
}
