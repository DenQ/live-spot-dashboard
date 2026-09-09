import { createContext } from 'react'

import type { PaperAccount, PaperOrder, PaperSide } from '@entities/paper-account'

export type TicketPrefill = {
  generation: number
  instrumentId: string
  qty: string
  limit?: string
  side?: PaperSide
}

export type PaperTradingContextValue = {
  account: PaperAccount
  equity: number
  unrealized: number
  marketValue: number
  submit: (input: { instrumentId: string; ticker: string; side: PaperSide; qty: number; limit: number }) => string | null
  cancel: (orderId: string) => void
  reset: () => void
  freeQty: (instrumentId: string) => number
  openOrders: PaperOrder[]
  ticketPrefill: TicketPrefill | null
  prefillTicket: (
    instrumentId: string,
    qty: number,
    extras?: { limit?: number; side?: PaperSide },
  ) => void
}

export const PaperTradingContext = createContext<PaperTradingContextValue | null>(null)
