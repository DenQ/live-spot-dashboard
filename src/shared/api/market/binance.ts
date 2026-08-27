import type { Candle } from '@entities/candle'
import type { Quote } from '@entities/quote'
import { requestJson } from '@shared/api/request'
import { openJsonWebSocket } from '@shared/api/websocket'
import { MARKET_WATCHLISTS } from '@shared/config'
import { isRecord } from '@shared/lib'

import type { MarketFeed } from './port'

const REST = 'https://api.binance.com/api/v3'
const WS = 'wss://stream.binance.com:9443/stream'
const INSTRUMENTS = MARKET_WATCHLISTS.binance

type BinanceTicker = {
  symbol: string
  lastPrice: string
  priceChangePercent: string
  volume: string
  closeTime: number
}

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
]

type MiniTickerEvent = {
  s: string
  c: string
  o: string
  v: string
  E: number
}

type KlineEvent = {
  k: {
    t: number
    o: string
    h: string
    l: string
    c: string
    v: string
  }
}

type StreamFrame<T> = {
  stream: string
  data: T
}

function toQuote(ticker: BinanceTicker): Quote {
  return {
    instrumentId: ticker.symbol,
    last: Number(ticker.lastPrice),
    changePct: Number(ticker.priceChangePercent),
    volume: Number(ticker.volume),
    ts: ticker.closeTime,
  }
}

function toCandle(instrumentId: string, row: BinanceKline): Candle {
  return {
    instrumentId,
    time: Math.floor(row[0] / 1000),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }
}

function isMiniTicker(value: unknown): value is StreamFrame<MiniTickerEvent> {
  if (!isRecord(value) || !isRecord(value.data)) {
    return false
  }

  return typeof value.data.s === 'string' && typeof value.data.c === 'string'
}

function isKline(value: unknown): value is StreamFrame<KlineEvent> {
  if (!isRecord(value) || !isRecord(value.data) || !isRecord(value.data.k)) {
    return false
  }

  return typeof value.data.k.t === 'number'
}

export function createBinanceFeed(): MarketFeed {
  return {
    id: 'binance',
    instruments: INSTRUMENTS,

    async fetchQuotes() {
      const symbols = encodeURIComponent(JSON.stringify(INSTRUMENTS.map((item) => item.id)))
      const payload = await requestJson<BinanceTicker[]>(`${REST}/ticker/24hr?symbols=${symbols}`)
      return payload.map(toQuote)
    },

    async fetchCandles(instrumentId) {
      const payload = await requestJson<BinanceKline[]>(
        `${REST}/klines?symbol=${instrumentId}&interval=1h&limit=168`,
      )
      return payload.map((row) => toCandle(instrumentId, row))
    },

    subscribeQuotes(onQuote, onRtt) {
      const streams = INSTRUMENTS.map((item) => `${item.id.toLowerCase()}@miniTicker`).join('/')
      return openJsonWebSocket(`${WS}?streams=${streams}`, {
        onMessage(payload) {
          if (!isMiniTicker(payload)) {
            return
          }

          const delay = Date.now() - payload.data.E
          if (delay >= 0 && delay < 30_000) {
            onRtt?.(delay)
          }

          const open = Number(payload.data.o)
          const last = Number(payload.data.c)
          onQuote({
            instrumentId: payload.data.s,
            last,
            changePct: open === 0 ? 0 : ((last - open) / open) * 100,
            volume: Number(payload.data.v),
            ts: payload.data.E,
          })
        },
      })
    },

    subscribeCandles(instrumentId, onCandle) {
      const stream = `${instrumentId.toLowerCase()}@kline_1h`
      return openJsonWebSocket(`${WS}?streams=${stream}`, {
        onMessage(payload) {
          if (!isKline(payload)) {
            return
          }

          const kline = payload.data.k
          onCandle({
            instrumentId,
            time: Math.floor(kline.t / 1000),
            open: Number(kline.o),
            high: Number(kline.h),
            low: Number(kline.l),
            close: Number(kline.c),
            volume: Number(kline.v),
          })
        },
      })
    },
  }
}
