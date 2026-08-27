import { ProviderSwitch, useMarketFeed } from '@features/market-feed'
import { AppHeader, PageShell } from '@shared/ui'
import { MarketChart } from '@widgets/market-chart'
import { MarketTable } from '@widgets/market-table'

import styles from './DashboardPage.module.css'

function formatLiveDetail(status: 'connecting' | 'live' | 'error', rttMs: number | null): string {
  if (status === 'live' && rttMs !== null) {
    return `${rttMs} ms`
  }

  return '—'
}

export function DashboardPage() {
  const { quoteStatus, quoteRttMs } = useMarketFeed()
  const liveTone = quoteStatus === 'live' ? 'live' : quoteStatus === 'error' ? 'error' : 'pending'
  const liveLabel = quoteStatus === 'error' ? 'Offline' : quoteStatus === 'live' ? 'Live' : 'Connecting'

  return (
    <PageShell>
      <AppHeader
        action={<ProviderSwitch />}
        liveTone={liveTone}
        liveLabel={liveLabel}
        liveDetail={formatLiveDetail(quoteStatus, quoteRttMs)}
      />
      <div className={styles.layout}>
        <MarketChart />
        <MarketTable />
      </div>
    </PageShell>
  )
}
