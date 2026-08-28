import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import type { PaperSide } from '@entities/paper-account'
import { useMarketFeed } from '@features/market-feed'

import { PaperTradingContext, type TicketPrefill } from './context'
import {
  cancelOrder,
  createAccount,
  freeQty as freeQtyOf,
  markToMarket,
  matchWorking,
  openOrders,
  resolvePending,
  submitOrder,
} from './engine'
import { persistAccount, readStoredAccount } from './storage'

function replayableRng(seeds: number[]) {
  return () => {
    let index = 0
    return () => seeds[index++] ?? Math.random()
  }
}

function toQtyInput(qty: number): string {
  if (!Number.isFinite(qty) || qty <= 0) {
    return '0.01'
  }

  return String(qty)
}

export function PaperTradingProvider({ children }: { children: ReactNode }) {
  const { quotesById } = useMarketFeed()
  const [account, setAccount] = useState(readStoredAccount)
  const [ticketPrefill, setTicketPrefill] = useState<TicketPrefill | null>(null)
  const quotesRef = useRef(quotesById)

  useEffect(() => {
    quotesRef.current = quotesById
  }, [quotesById])

  const lastById = useMemo(() => {
    const next: Record<string, number> = {}
    for (const [id, quote] of Object.entries(quotesById)) {
      if (Number.isFinite(quote.last)) {
        next[id] = quote.last
      }
    }
    return next
  }, [quotesById])

  useEffect(() => {
    persistAccount(account)
  }, [account])

  const submit = useCallback(
    (input: { instrumentId: string; ticker: string; side: PaperSide; qty: number; limit: number }) => {
      const now = Date.now()
      const makeRng = replayableRng([Math.random(), Math.random()])
      let error: string | null = null

      setAccount((current) => {
        const result = submitOrder(current, { ...input, now, rng: makeRng() })
        error = result.error
        return result.error ? current : result.account
      })

      return error
    },
    [],
  )

  const cancel = useCallback((orderId: string) => {
    const now = Date.now()
    setAccount((current) => cancelOrder(current, orderId, now))
  }, [])

  const reset = useCallback(() => {
    setAccount(createAccount())
  }, [])

  const prefillTicket = useCallback((instrumentId: string, qty: number) => {
    setTicketPrefill((current) => ({
      generation: (current?.generation ?? 0) + 1,
      instrumentId,
      qty: toQtyInput(qty),
    }))
  }, [])

  useEffect(() => {
    const pending = openOrders(account).filter((order) => order.status === 'pending')
    const timers = pending.map((order) => {
      const wait = Math.max(0, order.matchAt - Date.now())
      return window.setTimeout(() => {
        const makeRng = replayableRng([Math.random(), Math.random(), Math.random()])
        setAccount((current) => {
          const last = quotesRef.current[order.instrumentId]?.last ?? null
          return resolvePending(current, order.id, last, Date.now(), makeRng())
        })
      }, wait)
    })

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer)
      }
    }
  }, [account])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const lastById: Record<string, number> = {}
      for (const [id, quote] of Object.entries(quotesRef.current)) {
        if (Number.isFinite(quote.last)) {
          lastById[id] = quote.last
        }
      }

      const makeRng = replayableRng([Math.random(), Math.random(), Math.random()])
      setAccount((current) => matchWorking(current, lastById, Date.now(), makeRng()))
    }, 300)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  const stats = useMemo(() => markToMarket(account, lastById), [account, lastById])
  const working = useMemo(() => openOrders(account), [account])

  const value = useMemo(
    () => ({
      account,
      equity: stats.equity,
      unrealized: stats.unrealized,
      marketValue: stats.marketValue,
      submit,
      cancel,
      reset,
      freeQty: (instrumentId: string) => freeQtyOf(account, instrumentId),
      openOrders: working,
      ticketPrefill,
      prefillTicket,
    }),
    [
      account,
      cancel,
      prefillTicket,
      reset,
      stats.equity,
      stats.marketValue,
      stats.unrealized,
      submit,
      ticketPrefill,
      working,
    ],
  )

  return <PaperTradingContext.Provider value={value}>{children}</PaperTradingContext.Provider>
}
