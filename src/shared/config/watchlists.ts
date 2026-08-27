import type { MarketProviderId } from './market'

export type WatchlistItem = {
  id: string
  ticker: string
  name: string
  venue: string
  currency: string
}

const PAIRS: Omit<WatchlistItem, 'venue'>[] = [
  { id: 'BTCUSDT', ticker: 'BTCUSDT', name: 'Bitcoin', currency: 'USDT' },
  { id: 'ETHUSDT', ticker: 'ETHUSDT', name: 'Ethereum', currency: 'USDT' },
  { id: 'SOLUSDT', ticker: 'SOLUSDT', name: 'Solana', currency: 'USDT' },
  { id: 'BNBUSDT', ticker: 'BNBUSDT', name: 'BNB', currency: 'USDT' },
  { id: 'XRPUSDT', ticker: 'XRPUSDT', name: 'XRP', currency: 'USDT' },
  { id: 'DOGEUSDT', ticker: 'DOGEUSDT', name: 'Dogecoin', currency: 'USDT' },
]

export const MARKET_WATCHLISTS: Record<MarketProviderId, WatchlistItem[]> = {
  binance: PAIRS.map((item) => ({ ...item, venue: 'Binance' })),
  bybit: PAIRS.map((item) => ({ ...item, venue: 'Bybit' })),
}
