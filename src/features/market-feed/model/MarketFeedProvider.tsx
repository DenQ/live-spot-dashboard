import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import type { Candle } from '@entities/candle'
import type { Quote } from '@entities/quote'
import { createMarketFeed, type Unsubscribe } from '@shared/api'
import { MARKET_PROVIDERS, MARKET_WATCHLISTS, type MarketProviderId } from '@shared/config'

import { upsertCandle } from './candles'
import { MarketFeedContext, type FeedStatus } from './context'
import { indexQuotes, mergeQuote } from './quotes'
import { persistProvider, readStoredProvider } from './storage'

function toErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Market feed failed'
}

export function MarketFeedProvider({ children }: { children: ReactNode }) {
  const [providerId, setProviderIdState] = useState<MarketProviderId>(readStoredProvider)
  const [symbol, setSymbolState] = useState(() => MARKET_WATCHLISTS[readStoredProvider()][0]?.id ?? '')
  const [quotesById, setQuotesById] = useState<Record<string, Quote>>({})
  const [candles, setCandles] = useState<Candle[]>([])
  const [quoteStatus, setQuoteStatus] = useState<FeedStatus>('connecting')
  const [candleStatus, setCandleStatus] = useState<FeedStatus>('connecting')
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [candleError, setCandleError] = useState<string | null>(null)

  const instruments = MARKET_WATCHLISTS[providerId]
  const feed = useMemo(() => createMarketFeed(providerId), [providerId])

  const setProviderId = useCallback((id: MarketProviderId) => {
    setProviderIdState(id)
    setSymbolState(MARKET_WATCHLISTS[id][0]?.id ?? '')
    setQuotesById({})
    setCandles([])
    setQuoteStatus('connecting')
    setCandleStatus('connecting')
    setQuoteError(null)
    setCandleError(null)
    persistProvider(id)
  }, [])

  const setSymbol = useCallback((id: string) => {
    setSymbolState(id)
    setCandles([])
    setCandleStatus('connecting')
    setCandleError(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    let unsubscribe: Unsubscribe = () => undefined

    const run = async () => {
      try {
        const snapshot = await feed.fetchQuotes()
        if (cancelled) {
          return
        }

        setQuotesById(indexQuotes(snapshot))
        setQuoteStatus('live')
        setQuoteError(null)
        unsubscribe = feed.subscribeQuotes((quote) => {
          setQuotesById((current) => mergeQuote(current, quote))
        })
      } catch (cause) {
        if (!cancelled) {
          setQuoteStatus('error')
          setQuoteError(toErrorMessage(cause))
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

        setCandles(history)
        setCandleStatus('live')
        setCandleError(null)
        unsubscribe = feed.subscribeCandles(symbol, (candle) => {
          setCandles((current) => upsertCandle(current, candle))
        })
      } catch (cause) {
        if (!cancelled) {
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
      quotesById,
      candles,
      symbol,
      setSymbol,
      quoteStatus,
      candleStatus,
      quoteError,
      candleError,
    }),
    [
      candleError,
      candleStatus,
      candles,
      instruments,
      providerId,
      quoteError,
      quoteStatus,
      quotesById,
      setProviderId,
      setSymbol,
      symbol,
    ],
  )

  return <MarketFeedContext.Provider value={value}>{children}</MarketFeedContext.Provider>
}
