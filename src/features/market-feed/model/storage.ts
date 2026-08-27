import { APP_STORAGE_KEYS, isMarketProviderId, type MarketProviderId } from '@shared/config'

export function readStoredProvider(): MarketProviderId {
  try {
    const value = localStorage.getItem(APP_STORAGE_KEYS.provider)
    if (value && isMarketProviderId(value)) {
      return value
    }
  } catch {
    // ignore
  }

  return 'binance'
}

export function persistProvider(id: MarketProviderId) {
  try {
    localStorage.setItem(APP_STORAGE_KEYS.provider, id)
  } catch {
    // ignore
  }
}
