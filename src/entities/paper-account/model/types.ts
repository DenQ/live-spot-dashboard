export type PaperSide = 'buy' | 'sell'

export type PaperOrderStatus = 'pending' | 'working' | 'filled' | 'rejected' | 'canceled' | 'expired'

export type PaperPosition = {
  instrumentId: string
  qty: number
  avgPrice: number
}

export type PaperOrder = {
  id: string
  instrumentId: string
  ticker: string
  side: PaperSide
  qty: number
  limit: number
  status: PaperOrderStatus
  submittedAt: number
  matchAt: number
  expiresAt: number
  fillPrice: number | null
  fee: number | null
  reservedCash: number
  reservedQty: number
  reason: string | null
}

export type PaperLedgerEntry = {
  id: string
  orderId: string
  at: number
  instrumentId: string
  ticker: string
  side: PaperSide
  qty: number
  limit: number
  fillPrice: number | null
  fee: number | null
  status: Exclude<PaperOrderStatus, 'pending' | 'working'>
  reason: string | null
}

export type PaperAccount = {
  version: 1
  cash: number
  positions: Record<string, PaperPosition>
  orders: PaperOrder[]
  ledger: PaperLedgerEntry[]
}
