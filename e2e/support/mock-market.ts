import type { Page, WebSocketRoute } from '@playwright/test'

const PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT'] as const

export type MarketMockOptions = {
  dropKlineAfterMs?: number
}

function klineRow(symbol: string, index: number): (number | string)[] {
  const openTime = 1_700_000_000_000 + index * 3_600_000
  const base = symbol.startsWith('ETH') ? 3_000 : symbol.startsWith('SOL') ? 140 : 40_000
  const open = base + index
  return [openTime, String(open), String(open + 12), String(open - 8), String(open + 4), '128.5']
}

function binanceTickers() {
  return PAIRS.map((symbol, index) => ({
    symbol,
    lastPrice: String(40_000 + index),
    priceChangePercent: '1.25',
    volume: '1000',
    closeTime: Date.now(),
  }))
}

function bybitTicker(symbol: string) {
  return {
    retCode: 0,
    retMsg: 'OK',
    result: {
      list: [
        {
          symbol,
          lastPrice: '100',
          price24hPcnt: '0.0125',
          volume24h: '1000',
        },
      ],
    },
  }
}

function bybitKlines(symbol: string) {
  const list = Array.from({ length: 24 }, (_, index) => klineRow(symbol, 23 - index).map(String))
  return {
    retCode: 0,
    retMsg: 'OK',
    result: { list },
  }
}

function isKlineSocket(ws: WebSocketRoute) {
  const url = ws.url()
  return url.includes('kline') || url.includes('kline.')
}

export async function mockMarketApis(page: Page, options: MarketMockOptions = {}) {
  await page.route('https://api.binance.com/api/v3/ticker/24hr**', async (route) => {
    await route.fulfill({ json: binanceTickers() })
  })

  await page.route('https://api.binance.com/api/v3/klines**', async (route) => {
    const url = new URL(route.request().url())
    const symbol = url.searchParams.get('symbol') ?? 'BTCUSDT'
    const rows = Array.from({ length: 24 }, (_, index) => klineRow(symbol, index))
    await route.fulfill({ json: rows })
  })

  await page.route('https://api.bybit.com/v5/market/tickers**', async (route) => {
    const url = new URL(route.request().url())
    const symbol = url.searchParams.get('symbol') ?? 'BTCUSDT'
    await route.fulfill({ json: bybitTicker(symbol) })
  })

  await page.route('https://api.bybit.com/v5/market/kline**', async (route) => {
    const url = new URL(route.request().url())
    const symbol = url.searchParams.get('symbol') ?? 'BTCUSDT'
    await route.fulfill({ json: bybitKlines(symbol) })
  })

  await page.routeWebSocket(/stream\.binance\.com|stream\.bybit\.com/, (ws) => {
    if (options.dropKlineAfterMs !== undefined && isKlineSocket(ws)) {
      const timer = setTimeout(() => {
        ws.close()
      }, options.dropKlineAfterMs)
      ws.onClose(() => {
        clearTimeout(timer)
      })
    }
  })
}

export async function openApp(page: Page, path: string, options: MarketMockOptions = {}) {
  await page.addInitScript(() => {
    localStorage.clear()
  })
  await mockMarketApis(page, options)
  await page.goto(path)
}
