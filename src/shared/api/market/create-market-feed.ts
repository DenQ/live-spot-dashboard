import type { MarketProviderId } from '@shared/config'

import { createBinanceFeed } from './binance'
import { createBybitFeed } from './bybit'
import type { MarketFeed } from './port'

export function createMarketFeed(providerId: MarketProviderId): MarketFeed {
  if (providerId === 'bybit') {
    return createBybitFeed()
  }

  return createBinanceFeed()
}
