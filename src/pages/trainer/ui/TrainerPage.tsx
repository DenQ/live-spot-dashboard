import { ProviderSwitch, useMarketFeed } from '@features/market-feed'
import {
  EquityStrip,
  LedgerTable,
  ModeNav,
  OpenOrders,
  OrderTicket,
  PositionsPanel,
} from '@features/paper-trading'
import { AppHeader, PageShell } from '@shared/ui'
import { MarketChart } from '@widgets/market-chart'
import { MarketTable } from '@widgets/market-table'

import styles from './TrainerPage.module.css'

function formatLiveDetail(status: 'connecting' | 'live' | 'error', rttMs: number | null): string {
  if (status === 'live' && rttMs !== null) {
    return `${rttMs} ms`
  }

  return '—'
}

export function TrainerPage() {
  const { quoteStatus, quoteRttMs } = useMarketFeed()
  const liveTone = quoteStatus === 'live' ? 'live' : quoteStatus === 'error' ? 'error' : 'pending'
  const liveLabel = quoteStatus === 'error' ? 'Offline' : quoteStatus === 'live' ? 'Live' : 'Connecting'

  return (
    <PageShell>
      <AppHeader
        kicker="Paper"
        title="Trainer"
        nav={<ModeNav />}
        action={<ProviderSwitch />}
        liveTone={liveTone}
        liveLabel={liveLabel}
        liveDetail={formatLiveDetail(quoteStatus, quoteRttMs)}
      />
      <EquityStrip />
      <div className={styles.layout}>
        <div className={styles.stack}>
          <MarketChart />
          <MarketTable />
        </div>
        <div className={styles.stack}>
          <OrderTicket />
          <PositionsPanel />
        </div>
        <div className={styles.blotter}>
          <OpenOrders />
          <LedgerTable />
        </div>
      </div>
    </PageShell>
  )
}
