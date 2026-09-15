import { describe, expect, test } from 'vitest'

import { PAPER } from '@shared/config'

import { createAccount, roundCash, roundQty, submitOrder } from './engine'
import {
  canAffordBuy,
  deriveAmount,
  deriveQty,
  formatTicketAmount,
  formatTicketQty,
  maxBuyNotional,
  nextTicketFields,
  parseTicketNumber,
  qtyForMaxBuy,
  type TicketFields,
} from './ticket-fields'

const start = (overrides: Partial<TicketFields> = {}): TicketFields => ({
  qty: '0.01',
  amount: '400',
  driver: 'qty',
  ...overrides,
})

describe('parseTicketNumber', () => {
  test('accepts numbers greater than zero', () => {
    expect(parseTicketNumber('0.01')).toBe(0.01)
    expect(parseTicketNumber('100')).toBe(100)
  })

  test('rejects empty, incomplete, and non-positive input', () => {
    expect(parseTicketNumber('')).toBeNull()
    expect(parseTicketNumber('.')).toBeNull()
    expect(parseTicketNumber('0')).toBeNull()
    expect(parseTicketNumber('0.')).toBeNull()
    expect(parseTicketNumber('-1')).toBeNull()
    expect(parseTicketNumber('abc')).toBeNull()
  })
})

describe('deriveAmount / deriveQty', () => {
  test('qty 0.01 at 40000 is amount 400', () => {
    expect(deriveAmount('0.01', 40_000)).toBe('400')
  })

  test('amount 100 at 40000 is qty 0.0025', () => {
    expect(deriveQty('100', 40_000)).toBe('0.0025')
  })

  test('does not use scientific notation for tiny qty', () => {
    expect(formatTicketQty(1e-8)).toBe('0.00000001')
  })

  test('returns null when limit is zero or qty/amount is invalid', () => {
    expect(deriveAmount('0.01', 0)).toBeNull()
    expect(deriveAmount('', 40_000)).toBeNull()
    expect(deriveQty('100', 0)).toBeNull()
    expect(deriveQty('.', 40_000)).toBeNull()
  })

  test('amount to qty to amount stays within a cent', () => {
    const qty = deriveQty('100', 33_333.33)
    expect(qty).not.toBeNull()
    const back = deriveAmount(qty!, 33_333.33)
    expect(back).not.toBeNull()
    expect(Math.abs(Number(back) - 100)).toBeLessThanOrEqual(0.01)
  })
})

describe('nextTicketFields', () => {
  test('qty edit updates amount and becomes the driver', () => {
    expect(nextTicketFields(start({ amount: '', driver: 'amount' }), { type: 'qty', value: '0.01', limit: 40_000 })).toEqual({
      qty: '0.01',
      amount: '400',
      driver: 'qty',
    })
  })

  test('amount edit updates qty and becomes the driver', () => {
    expect(nextTicketFields(start(), { type: 'amount', value: '100', limit: 40_000 })).toEqual({
      qty: '0.0025',
      amount: '100',
      driver: 'amount',
    })
  })

  test('limit change with qty driver updates amount, not qty', () => {
    expect(nextTicketFields(start({ qty: '0.01', amount: '400', driver: 'qty' }), { type: 'limit', limit: 41_000 })).toEqual({
      qty: '0.01',
      amount: '410',
      driver: 'qty',
    })
  })

  test('limit change with amount driver updates qty, not amount', () => {
    expect(
      nextTicketFields(start({ qty: '0.0025', amount: '100', driver: 'amount' }), { type: 'limit', limit: 20_000 }),
    ).toEqual({
      qty: '0.005',
      amount: '100',
      driver: 'amount',
    })
  })

  test('keeps the typed driver string instead of rewriting it', () => {
    const next = nextTicketFields(start({ qty: '0.01', amount: '', driver: 'qty' }), { type: 'limit', limit: 40_000 })
    expect(next.qty).toBe('0.01')
    expect(next.qty).not.toBe('0.01000000')
    expect(next.amount).toBe('400')
  })

  test('invalid or empty input does not wipe the sibling field', () => {
    const seeded = start({ qty: '0.01', amount: '400', driver: 'qty' })

    expect(nextTicketFields(seeded, { type: 'qty', value: '', limit: 40_000 })).toEqual({
      qty: '',
      amount: '400',
      driver: 'qty',
    })
    expect(nextTicketFields(seeded, { type: 'qty', value: '.', limit: 40_000 }).amount).toBe('400')
    expect(nextTicketFields(seeded, { type: 'qty', value: '0.', limit: 40_000 }).amount).toBe('400')
    expect(nextTicketFields(seeded, { type: 'limit', limit: 0 })).toEqual(seeded)
  })

  test('zero limit does not divide when amount is the driver', () => {
    const seeded = start({ qty: '0.0025', amount: '100', driver: 'amount' })
    expect(nextTicketFields(seeded, { type: 'limit', limit: 0 })).toEqual(seeded)
  })
})

describe('max buy vs submitOrder', () => {
  test('maxBuyNotional is cash after fee', () => {
    expect(maxBuyNotional(1_000, 0.001)).toBe(roundCash(1_000 / 1.001))
    expect(maxBuyNotional(0, 0.001)).toBe(0)
  })

  test('qtyForMaxBuy submits, a cash-overflow qty does not', () => {
    const account = createAccount()
    const limit = 40_000
    const qty = qtyForMaxBuy(account.cash, limit, PAPER.takerFee)

    expect(qty).toBeGreaterThan(0)
    expect(roundCash(qty * limit * (1 + PAPER.takerFee))).toBeLessThanOrEqual(account.cash)

    const ok = submitOrder(account, {
      instrumentId: 'BTCUSDT',
      ticker: 'BTCUSDT',
      side: 'buy',
      qty,
      limit,
      now: 1,
      rng: () => 0.5,
    })
    expect(ok.error).toBeNull()

    const over = submitOrder(account, {
      instrumentId: 'BTCUSDT',
      ticker: 'BTCUSDT',
      side: 'buy',
      qty: roundQty(account.cash / limit),
      limit,
      now: 1,
      rng: () => 0.5,
    })
    expect(over.error).toBe('Not enough cash for this bid')
  })

  test('qtyForMaxBuy fits cheap and expensive limits', () => {
    for (const limit of [0.05, 3, 40_000, 100_000]) {
      const cash = 1_000
      const qty = qtyForMaxBuy(cash, limit, PAPER.takerFee)
      expect(qty).toBeGreaterThan(0)
      expect(roundCash(qty * limit * (1 + PAPER.takerFee))).toBeLessThanOrEqual(cash)

      const result = submitOrder(createAccount(), {
        instrumentId: 'BTCUSDT',
        ticker: 'BTCUSDT',
        side: 'buy',
        qty,
        limit,
        now: 1,
        rng: () => 0.5,
      })
      expect(result.error).toBeNull()
    }
  })

  test('Max cash amount derives a qty the engine accepts', () => {
    const account = createAccount()
    const limit = 40_000
    const qty = qtyForMaxBuy(account.cash, limit, PAPER.takerFee)
    const amount = formatTicketAmount(qty * limit)
    const fields = nextTicketFields(start(), { type: 'amount', value: amount, limit })

    const result = submitOrder(account, {
      instrumentId: 'BTCUSDT',
      ticker: 'BTCUSDT',
      side: 'buy',
      qty: Number(fields.qty),
      limit,
      now: 1,
      rng: () => 0.5,
    })
    expect(result.error).toBeNull()
  })
})

describe('canAffordBuy', () => {
  test('allows a max-cash qty and rejects a cash-overflow qty', () => {
    const cash = 1_000
    const limit = 40_000
    const fee = PAPER.takerFee
    const maxQty = qtyForMaxBuy(cash, limit, fee)

    expect(canAffordBuy(maxQty, limit, cash, fee)).toBe(true)
    expect(canAffordBuy(roundQty(cash / limit), limit, cash, fee)).toBe(false)
  })

  test('blocks when notional plus fee exceeds cash', () => {
    expect(canAffordBuy(0.01, 40_000, 1_000, PAPER.takerFee)).toBe(true)
    expect(canAffordBuy(1, 40_000, 1_000, PAPER.takerFee)).toBe(false)
  })

  test('does not extra-block incomplete qty or limit', () => {
    expect(canAffordBuy(0, 40_000, 1_000, PAPER.takerFee)).toBe(true)
    expect(canAffordBuy(0.01, 0, 1_000, PAPER.takerFee)).toBe(true)
    expect(canAffordBuy(Number.NaN, 40_000, 1_000, PAPER.takerFee)).toBe(true)
  })
})
