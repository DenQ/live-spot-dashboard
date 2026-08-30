import { createContext } from 'react'

import type { PaperAccount, PaperOrder, PaperSide } from '@entities/paper-account'

export type TicketPrefill = {
  generation: number
  instrumentId: string
  qty: string
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
  prefillTicket: (instrumentId: string, qty: number) => void
}

export const PaperTradingContext = createContext<PaperTradingContextValue | null>(null)
