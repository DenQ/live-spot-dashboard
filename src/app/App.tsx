import { MarketFeedProvider } from '@features/market-feed'

import { AppRouter } from './providers/router'

export function App() {
  return (
    <MarketFeedProvider>
      <AppRouter />
    </MarketFeedProvider>
  )
}
