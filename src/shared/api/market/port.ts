import type { Candle } from '@entities/candle'
import type { Instrument } from '@entities/instrument'
import type { Quote } from '@entities/quote'
import type { MarketProviderId } from '@shared/config'

import type { Unsubscribe } from '../websocket'

export type { Unsubscribe }

export type MarketFeed = {
  readonly id: MarketProviderId
  readonly instruments: Instrument[]
  fetchQuotes: () => Promise<Quote[]>
  fetchCandles: (instrumentId: string) => Promise<Candle[]>
  subscribeQuotes: (onQuote: (quote: Quote) => void) => Unsubscribe
  subscribeCandles: (instrumentId: string, onCandle: (candle: Candle) => void) => Unsubscribe
}
