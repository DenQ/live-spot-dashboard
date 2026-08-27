export const MARKET_PROVIDER_IDS = ['binance', 'bybit'] as const

export type MarketProviderId = (typeof MARKET_PROVIDER_IDS)[number]

export type MarketProviderMeta = {
  id: MarketProviderId
  label: string
  hint: string
}

export const MARKET_PROVIDERS: readonly MarketProviderMeta[] = [
  { id: 'binance', label: 'Binance', hint: 'Spot' },
  { id: 'bybit', label: 'Bybit', hint: 'Spot' },
]

export function isMarketProviderId(value: string): value is MarketProviderId {
  return MARKET_PROVIDER_IDS.includes(value as MarketProviderId)
}
