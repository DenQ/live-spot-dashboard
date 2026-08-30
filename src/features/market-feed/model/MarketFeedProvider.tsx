import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { createMarketFeed, type Unsubscribe } from '@shared/api'
import { MARKET_PROVIDERS, MARKET_WATCHLISTS, type MarketProviderId } from '@shared/config'

import { applyLiveCandle, replaceCandles, resetCandles } from './candles-store'
import { MarketFeedContext, type FeedStatus } from './context'
import { indexQuotes } from './quotes'
import { applyQuote, replaceQuotes, resetQuotes } from './quotes-store'
import { persistProvider, readStoredProvider } from './storage'

function toErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Market feed failed'
}

const RTT_EMA = 0.3
const RTT_FLUSH_MS = 1000

function blendRtt(current: number | null, sample: number): number {
  if (current === null) {
    return sample
  }

  return Math.round(current * (1 - RTT_EMA) + sample * RTT_EMA)
}

export function MarketFeedProvider({ children }: { children: ReactNode }) {
  const [providerId, setProviderIdState] = useState<MarketProviderId>(readStoredProvider)
  const [symbol, setSymbolState] = useState(() => MARKET_WATCHLISTS[readStoredProvider()][0]?.id ?? '')
  const [quoteStatus, setQuoteStatus] = useState<FeedStatus>('connecting')
  const [candleStatus, setCandleStatus] = useState<FeedStatus>('connecting')
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [candleError, setCandleError] = useState<string | null>(null)
  const [quoteRttMs, setQuoteRttMs] = useState<number | null>(null)
  const rttHold = useRef<number | null>(null)
  const rttFlushedAt = useRef(0)

  const instruments = MARKET_WATCHLISTS[providerId]
  const feed = useMemo(() => createMarketFeed(providerId), [providerId])

  const setProviderId = useCallback((id: MarketProviderId) => {
    if (id === providerId) {
      return
    }

    resetQuotes()
    resetCandles()
    rttHold.current = null
    rttFlushedAt.current = 0
    setProviderIdState(id)
    setSymbolState(MARKET_WATCHLISTS[id][0]?.id ?? '')
    setQuoteStatus('connecting')
    setCandleStatus('connecting')
    setQuoteError(null)
    setCandleError(null)
    setQuoteRttMs(null)
    persistProvider(id)
  }, [providerId])

  const setSymbol = useCallback((id: string) => {
    resetCandles()
    setSymbolState(id)
    setCandleStatus('connecting')
    setCandleError(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    let unsubscribe: Unsubscribe = () => undefined

    const flushRtt = (sample: number) => {
      rttHold.current = blendRtt(rttHold.current, sample)
      const now = performance.now()
      if (rttFlushedAt.current !== 0 && now - rttFlushedAt.current < RTT_FLUSH_MS) {
        return
      }

      rttFlushedAt.current = now
      const next = rttHold.current
      setQuoteRttMs((current) => (current === next ? current : next))
    }

    const run = async () => {
      try {
        const snapshot = await feed.fetchQuotes()
        if (cancelled) {
          return
        }

        replaceQuotes(indexQuotes(snapshot))
        setQuoteStatus('live')
        setQuoteError(null)
        unsubscribe = feed.subscribeQuotes(applyQuote, flushRtt)
      } catch (cause) {
        if (!cancelled) {
          resetQuotes()
          setQuoteStatus('error')
          setQuoteError(toErrorMessage(cause))
          setQuoteRttMs(null)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [feed])

  useEffect(() => {
    if (!symbol) {
      return
    }

    let cancelled = false
    let unsubscribe: Unsubscribe = () => undefined

    const run = async () => {
      try {
        const history = await feed.fetchCandles(symbol)
        if (cancelled) {
          return
        }

        replaceCandles(history)
        setCandleStatus('live')
        setCandleError(null)
        unsubscribe = feed.subscribeCandles(symbol, applyLiveCandle)
      } catch (cause) {
        if (!cancelled) {
          resetCandles()
          setCandleStatus('error')
          setCandleError(toErrorMessage(cause))
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [feed, symbol])

  const value = useMemo(
    () => ({
      providerId,
      setProviderId,
      providers: MARKET_PROVIDERS,
      instruments,
      symbol,
      setSymbol,
      quoteStatus,
      candleStatus,
      quoteError,
      candleError,
      quoteRttMs,
    }),
    [
      candleError,
      candleStatus,
      instruments,
      providerId,
      quoteError,
      quoteRttMs,
      quoteStatus,
      setProviderId,
      setSymbol,
      symbol,
    ],
  )

  return <MarketFeedContext.Provider value={value}>{children}</MarketFeedContext.Provider>
}
