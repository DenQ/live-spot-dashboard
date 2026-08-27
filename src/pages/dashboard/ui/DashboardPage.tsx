import { ProviderSwitch, useMarketFeed } from '@features/market-feed'
import { AppHeader, PageShell } from '@shared/ui'
import { MarketChart } from '@widgets/market-chart'
import { MarketTable } from '@widgets/market-table'

import styles from './DashboardPage.module.css'

export function DashboardPage() {
  const { quoteStatus, providers, providerId } = useMarketFeed()
  const provider = providers.find((item) => item.id === providerId)
  const liveTone = quoteStatus === 'live' ? 'live' : quoteStatus === 'error' ? 'error' : 'pending'
  const liveLabel = quoteStatus === 'error' ? 'Offline' : quoteStatus === 'live' ? 'Live' : 'Connecting'

  return (
    <PageShell>
      <AppHeader
        action={<ProviderSwitch />}
        liveTone={liveTone}
        liveLabel={liveLabel}
        sessionLabel={provider?.label ?? 'Spot'}
      />
      <div className={styles.layout}>
        <MarketChart />
        <MarketTable />
      </div>
    </PageShell>
  )
}
