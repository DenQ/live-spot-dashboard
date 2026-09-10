import { CoachProvider } from '@features/coach'
import { MarketFeedProvider } from '@features/market-feed'
import { PaperTradingProvider } from '@features/paper-trading'
import { ThemeProvider } from '@features/theme'

import { AppRouter } from './providers/router'

export function App() {
  return (
    <ThemeProvider>
      <MarketFeedProvider>
        <PaperTradingProvider>
          <CoachProvider>
            <AppRouter />
          </CoachProvider>
        </PaperTradingProvider>
      </MarketFeedProvider>
    </ThemeProvider>
  )
}
