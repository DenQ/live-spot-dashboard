import { CoachProvider } from '@features/coach'
import { MarketFeedProvider } from '@features/market-feed'
import { PaperTradingProvider } from '@features/paper-trading'

import { AppRouter } from './providers/router'

export function App() {
  return (
    <MarketFeedProvider>
      <PaperTradingProvider>
        <CoachProvider>
          <AppRouter />
        </CoachProvider>
      </PaperTradingProvider>
    </MarketFeedProvider>
  )
}
