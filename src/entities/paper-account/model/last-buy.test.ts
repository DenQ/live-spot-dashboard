import { describe, expect, test } from 'vitest'

import { lastOpenBuy } from './last-buy'
import type { PaperAccount, PaperLedgerEntry } from './types'

function account(overrides: Partial<PaperAccount> = {}): PaperAccount {
  return {
    version: 1,
    cash: 1_000,
    positions: {},
    orders: [],
    ledger: [],
    ...overrides,
  }
}

function ledgerEntry(overrides: Partial<PaperLedgerEntry> = {}): PaperLedgerEntry {
  return {
    id: 'led_1',
    orderId: 'ord_1',
    at: 1,
    instrumentId: 'BTCUSDT',
    ticker: 'BTCUSDT',
    side: 'buy',
    qty: 0.01,
    limit: 100,
    fillPrice: 100,
    fee: 0.1,
    status: 'filled',
    reason: null,
    ...overrides,
  }
}

describe('lastOpenBuy', () => {
  test('returns null when the pair is not in the portfolio', () => {
    const next = account({
      ledger: [ledgerEntry({ fillPrice: 95_000, at: 1_700_000_000_000 })],
    })

    expect(lastOpenBuy(next, 'BTCUSDT')).toBeNull()
  })

  test('returns null when the position is closed even if a buy remains in the ledger', () => {
    const next = account({
      ledger: [
        ledgerEntry({ id: 'led_sell', side: 'sell', fillPrice: 100_000, status: 'filled' }),
        ledgerEntry({ fillPrice: 95_000, at: 1_700_000_000_000 }),
      ],
    })

    expect(lastOpenBuy(next, 'BTCUSDT')).toBeNull()
  })

  test('returns null for a different pair', () => {
    const next = account({
      positions: { BTCUSDT: { instrumentId: 'BTCUSDT', qty: 0.01, avgPrice: 95_000 } },
      ledger: [ledgerEntry({ fillPrice: 95_000, at: 1_700_000_000_000 })],
    })

    expect(lastOpenBuy(next, 'ETHUSDT')).toBeNull()
  })

  test('returns the newest filled buy price and time for an open position', () => {
    const next = account({
      positions: { BTCUSDT: { instrumentId: 'BTCUSDT', qty: 0.03, avgPrice: 96_000 } },
      ledger: [
        ledgerEntry({ id: 'led_new', at: 3, fillPrice: 98_000 }),
        ledgerEntry({ id: 'led_old', at: 1, fillPrice: 94_000 }),
      ],
    })

    expect(lastOpenBuy(next, 'BTCUSDT')).toEqual({ price: 98_000, at: 3 })
  })

  test('ignores sells and non-filled buys', () => {
    const next = account({
      positions: { BTCUSDT: { instrumentId: 'BTCUSDT', qty: 0.01, avgPrice: 95_000 } },
      ledger: [
        ledgerEntry({ id: 'led_sell', side: 'sell', fillPrice: 101_000, status: 'filled' }),
        ledgerEntry({ id: 'led_reject', fillPrice: 90_000, status: 'rejected' }),
        ledgerEntry({ id: 'led_buy', fillPrice: 95_000, at: 42, status: 'filled' }),
      ],
    })

    expect(lastOpenBuy(next, 'BTCUSDT')).toEqual({ price: 95_000, at: 42 })
  })

  test('falls back to avgPrice without a time when the ledger has no filled buy', () => {
    const next = account({
      positions: { BTCUSDT: { instrumentId: 'BTCUSDT', qty: 0.01, avgPrice: 96_500 } },
    })

    expect(lastOpenBuy(next, 'BTCUSDT')).toEqual({ price: 96_500, at: null })
  })
})
