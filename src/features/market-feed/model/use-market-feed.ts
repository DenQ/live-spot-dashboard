import { useContext } from 'react'

import { MarketFeedContext } from './context'

export function useMarketFeed() {
  const value = useContext(MarketFeedContext)

  if (!value) {
    throw new Error('useMarketFeed must be used inside MarketFeedProvider')
  }

  return value
}
