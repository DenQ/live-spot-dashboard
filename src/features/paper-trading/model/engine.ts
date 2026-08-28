import type {
  PaperAccount,
  PaperLedgerEntry,
  PaperOrder,
  PaperOrderStatus,
  PaperPosition,
  PaperSide,
} from '@entities/paper-account'
import { PAPER } from '@shared/config'

const QTY_EPS = 1e-8

export type SubmitInput = {
  instrumentId: string
  ticker: string
  side: PaperSide
  qty: number
  limit: number
  now: number
  rng: () => number
}

export type SubmitResult = {
  account: PaperAccount
  error: string | null
}

export function createAccount(): PaperAccount {
  return {
    version: 1,
    cash: PAPER.startingCash,
    positions: {},
    orders: [],
    ledger: [],
  }
}

export function isOpenStatus(status: PaperOrderStatus): boolean {
  return status === 'pending' || status === 'working'
}

export function openOrders(account: PaperAccount): PaperOrder[] {
  return account.orders.filter((order) => isOpenStatus(order.status))
}

export function reservedQty(account: PaperAccount, instrumentId: string): number {
  return openOrders(account)
    .filter((order) => order.instrumentId === instrumentId && order.side === 'sell')
    .reduce((sum, order) => sum + order.reservedQty, 0)
}

export function freeQty(account: PaperAccount, instrumentId: string): number {
  const position = account.positions[instrumentId]
  if (!position) {
    return 0
  }

  return roundQty(Math.max(0, position.qty - reservedQty(account, instrumentId)))
}

export function markToMarket(
  account: PaperAccount,
  lastById: Record<string, number>,
): { equity: number; unrealized: number; marketValue: number } {
  let marketValue = 0
  let cost = 0

  for (const position of Object.values(account.positions)) {
    const last = lastById[position.instrumentId]
    if (!Number.isFinite(last)) {
      continue
    }

    marketValue += position.qty * last
    cost += position.qty * position.avgPrice
  }

  const unrealized = marketValue - cost
  return {
    marketValue: roundCash(marketValue),
    unrealized: roundCash(unrealized),
    equity: roundCash(account.cash + marketValue),
  }
}

export function submitOrder(account: PaperAccount, input: SubmitInput): SubmitResult {
  const qty = roundQty(input.qty)
  const limit = input.limit

  if (!Number.isFinite(qty) || qty <= 0) {
    return { account, error: 'Enter a quantity greater than zero' }
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    return { account, error: 'Enter a valid limit price' }
  }

  const delay =
    PAPER.matchDelayMs.min + input.rng() * (PAPER.matchDelayMs.max - PAPER.matchDelayMs.min)

  if (input.side === 'buy') {
    const reservedCash = roundCash(qty * limit * (1 + PAPER.takerFee))
    if (reservedCash > account.cash + 1e-9) {
      return { account, error: 'Not enough cash for this bid' }
    }

    const order = makeOrder(input, qty, limit, reservedCash, 0, delay)
    return {
      error: null,
      account: prune({
        ...account,
        cash: roundCash(account.cash - reservedCash),
        orders: [...account.orders, order],
      }),
    }
  }

  const available = freeQty(account, input.instrumentId)
  if (qty > available + QTY_EPS) {
    return { account, error: 'Not enough coins to sell' }
  }

  const order = makeOrder(input, qty, limit, 0, qty, delay)
  return {
    error: null,
    account: prune({
      ...account,
      orders: [...account.orders, order],
    }),
  }
}

export function cancelOrder(account: PaperAccount, orderId: string, now: number): PaperAccount {
  const order = account.orders.find((item) => item.id === orderId)
  if (!order || !isOpenStatus(order.status)) {
    return account
  }

  return settle(account, order, 'canceled', now, 'Canceled')
}

export function resolvePending(
  account: PaperAccount,
  orderId: string,
  last: number | null,
  now: number,
  rng: () => number,
): PaperAccount {
  const order = account.orders.find((item) => item.id === orderId)
  if (!order || order.status !== 'pending') {
    return account
  }

  if (now >= order.expiresAt) {
    return settle(account, order, 'expired', now, 'Expired')
  }

  if (last == null || !Number.isFinite(last)) {
    return patchOrder(account, order.id, { status: 'working' })
  }

  if (!isMarketable(order.side, order.limit, last)) {
    return patchOrder(account, order.id, { status: 'working' })
  }

  if (rng() >= PAPER.fillChance) {
    return settle(account, order, 'rejected', now, 'No counterparty')
  }

  return fillOrder(account, order, last, now, rng)
}

export function matchWorking(
  account: PaperAccount,
  lastById: Record<string, number>,
  now: number,
  rng: () => number,
): PaperAccount {
  let next = account

  for (const order of account.orders) {
    if (order.status !== 'working') {
      continue
    }

    const current = next.orders.find((item) => item.id === order.id)
    if (!current || current.status !== 'working') {
      continue
    }

    if (now >= current.expiresAt) {
      next = settle(next, current, 'expired', now, 'Expired')
      continue
    }

    const last = lastById[current.instrumentId]
    if (!Number.isFinite(last) || !isMarketable(current.side, current.limit, last)) {
      continue
    }

    next = fillOrder(next, current, last, now, rng)
  }

  return next
}

function makeOrder(
  input: SubmitInput,
  qty: number,
  limit: number,
  reservedCash: number,
  reservedQtyValue: number,
  delay: number,
): PaperOrder {
  return {
    id: createOrderId(input.now, input.rng),
    instrumentId: input.instrumentId,
    ticker: input.ticker,
    side: input.side,
    qty,
    limit,
    status: 'pending',
    submittedAt: input.now,
    matchAt: Math.round(input.now + delay),
    expiresAt: input.now + PAPER.workingTtlMs,
    fillPrice: null,
    fee: null,
    reservedCash,
    reservedQty: reservedQtyValue,
    reason: null,
  }
}

function fillOrder(
  account: PaperAccount,
  order: PaperOrder,
  last: number,
  now: number,
  rng: () => number,
): PaperAccount {
  const fillPrice = applySlippage(order.side, last, order.limit, rng)
  const notional = order.qty * fillPrice
  const fee = roundCash(notional * PAPER.takerFee)

  if (order.side === 'buy') {
    const spent = roundCash(notional + fee)
    const refund = roundCash(Math.max(0, order.reservedCash - spent))
    const position = addBuy(account.positions[order.instrumentId], order.instrumentId, order.qty, fillPrice)

    return finalize(
      {
        ...account,
        cash: roundCash(account.cash + refund),
        positions: { ...account.positions, [order.instrumentId]: position },
      },
      order,
      'filled',
      now,
      fillPrice,
      fee,
      null,
    )
  }

  const proceeds = roundCash(notional - fee)
  const positions = applySell(account.positions, order.instrumentId, order.qty)

  return finalize(
    {
      ...account,
      cash: roundCash(account.cash + proceeds),
      positions,
    },
    order,
    'filled',
    now,
    fillPrice,
    fee,
    null,
  )
}

function settle(
  account: PaperAccount,
  order: PaperOrder,
  status: Extract<PaperOrderStatus, 'rejected' | 'canceled' | 'expired'>,
  now: number,
  reason: string,
): PaperAccount {
  const released = order.side === 'buy' ? roundCash(account.cash + order.reservedCash) : account.cash

  return finalize({ ...account, cash: released }, order, status, now, null, null, reason)
}

function finalize(
  account: PaperAccount,
  order: PaperOrder,
  status: PaperLedgerEntry['status'],
  now: number,
  fillPrice: number | null,
  fee: number | null,
  reason: string | null,
): PaperAccount {
  const nextOrder: PaperOrder = {
    ...order,
    status,
    fillPrice,
    fee,
    reservedCash: 0,
    reservedQty: 0,
    reason,
  }

  const entry: PaperLedgerEntry = {
    id: `led_${order.id}`,
    orderId: order.id,
    at: now,
    instrumentId: order.instrumentId,
    ticker: order.ticker,
    side: order.side,
    qty: order.qty,
    limit: order.limit,
    fillPrice,
    fee,
    status,
    reason,
  }

  return prune({
    ...account,
    orders: account.orders.map((item) => (item.id === order.id ? nextOrder : item)),
    ledger: [entry, ...account.ledger],
  })
}

function patchOrder(account: PaperAccount, orderId: string, patch: Partial<PaperOrder>): PaperAccount {
  return {
    ...account,
    orders: account.orders.map((item) => (item.id === orderId ? { ...item, ...patch } : item)),
  }
}

function addBuy(
  current: PaperPosition | undefined,
  instrumentId: string,
  qty: number,
  price: number,
): PaperPosition {
  if (!current) {
    return { instrumentId, qty: roundQty(qty), avgPrice: price }
  }

  const nextQty = current.qty + qty
  return {
    instrumentId,
    qty: roundQty(nextQty),
    avgPrice: (current.qty * current.avgPrice + qty * price) / nextQty,
  }
}

function applySell(
  positions: Record<string, PaperPosition>,
  instrumentId: string,
  qty: number,
): Record<string, PaperPosition> {
  const current = positions[instrumentId]
  if (!current) {
    return positions
  }

  const nextQty = roundQty(current.qty - qty)
  const next = { ...positions }

  if (nextQty <= QTY_EPS) {
    delete next[instrumentId]
    return next
  }

  next[instrumentId] = { ...current, qty: nextQty }
  return next
}

function isMarketable(side: PaperSide, limit: number, last: number): boolean {
  return side === 'buy' ? last <= limit : last >= limit
}

function applySlippage(side: PaperSide, last: number, limit: number, rng: () => number): number {
  const slip = (rng() * PAPER.slippageBps.max) / 10_000

  if (side === 'buy') {
    return Math.min(limit, last * (1 + slip))
  }

  return Math.max(limit, last * (1 - slip))
}

function prune(account: PaperAccount): PaperAccount {
  const open = account.orders.filter((order) => isOpenStatus(order.status))
  const closed = account.orders.filter((order) => !isOpenStatus(order.status)).slice(-PAPER.closedOrderLimit)

  return {
    ...account,
    orders: [...open, ...closed],
    ledger: account.ledger.slice(0, PAPER.ledgerLimit),
  }
}

function createOrderId(now: number, rng: () => number): string {
  return `ord_${now.toString(36)}_${Math.floor(rng() * 1e9).toString(36)}`
}

function roundCash(value: number): number {
  return Math.round(value * 100) / 100
}

function roundQty(value: number): number {
  return Math.round(value * 1e8) / 1e8
}
