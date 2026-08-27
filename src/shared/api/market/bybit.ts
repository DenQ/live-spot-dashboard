import type { Quote } from '@entities/quote'
import { requestJson } from '@shared/api/request'
import { openJsonWebSocket } from '@shared/api/websocket'
import { MARKET_WATCHLISTS } from '@shared/config'
import { isRecord } from '@shared/lib'

import type { MarketFeed } from './port'

const REST = 'https://api.bybit.com'
const WS = 'wss://stream.bybit.com/v5/public/spot'
const INSTRUMENTS = MARKET_WATCHLISTS.bybit

type BybitTicker = {
  symbol: string
  lastPrice: string
  price24hPcnt: string
  volume24h: string
}

type BybitListResponse<T> = {
  retCode: number
  retMsg: string
  result: {
    list: T[]
  }
}

type BybitWsFrame = {
  op?: string
  topic?: string
  data?: unknown
}

function toPct(value: string): number {
  return Number(value) * 100
}

function toQuote(ticker: BybitTicker): Quote {
  return {
    instrumentId: ticker.symbol,
    last: Number(ticker.lastPrice),
    changePct: toPct(ticker.price24hPcnt),
    volume: Number(ticker.volume24h),
    ts: Date.now(),
  }
}

export function createBybitFeed(): MarketFeed {
  return {
    id: 'bybit',
    instruments: INSTRUMENTS,

    async fetchQuotes() {
      const rows = await Promise.all(
        INSTRUMENTS.map(async (instrument) => {
          const payload = await requestJson<BybitListResponse<BybitTicker>>(
            `${REST}/v5/market/tickers?category=spot&symbol=${instrument.id}`,
          )

          if (payload.retCode !== 0 || !payload.result.list[0]) {
            throw new Error(payload.retMsg || `Bybit ticker failed: ${instrument.id}`)
          }

          return toQuote(payload.result.list[0])
        }),
      )

      return rows
    },

    async fetchCandles(instrumentId) {
      const payload = await requestJson<BybitListResponse<string[]>>(
        `${REST}/v5/market/kline?category=spot&symbol=${instrumentId}&interval=60&limit=168`,
      )

      if (payload.retCode !== 0) {
        throw new Error(payload.retMsg || 'Bybit kline failed')
      }

      return [...payload.result.list].reverse().map((row) => ({
        instrumentId,
        time: Math.floor(Number(row[0]) / 1000),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: Number(row[5]),
      }))
    },

    subscribeQuotes(onQuote) {
      return openJsonWebSocket(WS, {
        onOpen(socket) {
          socket.send(
            JSON.stringify({
              op: 'subscribe',
              args: INSTRUMENTS.map((item) => `tickers.${item.id}`),
            }),
          )
        },
        onMessage(payload, socket) {
          const frame = payload as BybitWsFrame

          if (frame.op === 'ping') {
            socket.send(JSON.stringify({ op: 'pong' }))
            return
          }

          if (!frame.topic?.startsWith('tickers.') || !isRecord(frame.data)) {
            return
          }

          const last = frame.data.lastPrice
          const pct = frame.data.price24hPcnt
          const volume = frame.data.volume24h
          const symbol =
            typeof frame.data.symbol === 'string' ? frame.data.symbol : frame.topic.slice('tickers.'.length)

          if (typeof last !== 'string') {
            return
          }

          onQuote({
            instrumentId: symbol,
            last: Number(last),
            changePct: typeof pct === 'string' ? toPct(pct) : Number.NaN,
            volume: typeof volume === 'string' ? Number(volume) : 0,
            ts: Date.now(),
          })
        },
      })
    },

    subscribeCandles(instrumentId, onCandle) {
      return openJsonWebSocket(WS, {
        onOpen(socket) {
          socket.send(JSON.stringify({ op: 'subscribe', args: [`kline.60.${instrumentId}`] }))
        },
        onMessage(payload, socket) {
          const frame = payload as BybitWsFrame

          if (frame.op === 'ping') {
            socket.send(JSON.stringify({ op: 'pong' }))
            return
          }

          if (!frame.topic?.startsWith('kline.') || !Array.isArray(frame.data)) {
            return
          }

          const row = frame.data[0]
          if (!isRecord(row)) {
            return
          }

          onCandle({
            instrumentId,
            time: Math.floor(Number(row.start) / 1000),
            open: Number(row.open),
            high: Number(row.high),
            low: Number(row.low),
            close: Number(row.close),
            volume: Number(row.volume),
          })
        },
      })
    },
  }
}
