import { createContext } from 'react'

import type { Candle } from '@entities/candle'
import type { Instrument } from '@entities/instrument'
import type { Quote } from '@entities/quote'
import type { MarketProviderId, MarketProviderMeta } from '@shared/config'

export type FeedStatus = 'connecting' | 'live' | 'error'

export type MarketFeedContextValue = {
  providerId: MarketProviderId
  setProviderId: (id: MarketProviderId) => void
  providers: readonly MarketProviderMeta[]
  instruments: Instrument[]
  quotesById: Record<string, Quote>
  candles: Candle[]
  symbol: string
  setSymbol: (id: string) => void
  quoteStatus: FeedStatus
  candleStatus: FeedStatus
  quoteError: string | null
  candleError: string | null
}

export const MarketFeedContext = createContext<MarketFeedContextValue | null>(null)
