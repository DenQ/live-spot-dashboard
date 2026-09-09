import type { CoachAction, CoachAdvice, CoachRegime } from '@entities/coach'
import { useMarketFeed } from '@features/market-feed'
import { usePaperTrading } from '@features/paper-trading'
import { formatPrice } from '@shared/lib'
import { Panel } from '@shared/ui'

import { useCoach } from '../model/use-coach'
import styles from './CoachPanel.module.css'

const REGIME_LABEL: Record<CoachRegime, string> = {
  trend_up: 'Trend up',
  trend_down: 'Trend down',
  range: 'Range',
  spike: 'Spike',
}

const ACTION_LABEL: Record<CoachAction, string> = {
  buy: 'Buy',
  sell: 'Sell',
  wait: 'Wait',
}

export function CoachPanel() {
  const { hintsEnabled, advice, error } = useCoach()
  const { symbol } = useMarketFeed()
  const { prefillTicket } = usePaperTrading()

  if (!hintsEnabled) {
    return null
  }

  const hint = advice ? REGIME_LABEL[advice.regime] : 'Live filter'
  const canApply = advice?.action === 'buy' || advice?.action === 'sell'

  const apply = () => {
    if (!advice || advice.suggestedLimit === null || (advice.action !== 'buy' && advice.action !== 'sell')) {
      return
    }

    prefillTicket(symbol, 0.01, { limit: advice.suggestedLimit, side: advice.action })
  }

  return (
    <Panel title="Coach" hint={hint}>
      <div className={styles.body} data-testid="coach-panel">
        {error ? <p className={styles.error}>{error}</p> : null}
        {advice ? <AdviceBody advice={advice} /> : <p className={styles.empty}>Waiting for candles…</p>}
        {canApply ? (
          <button type="button" className={styles.apply} onClick={apply}>
            Use in ticket
          </button>
        ) : null}
        <p className={styles.note}>Practice filter, not financial advice.</p>
      </div>
    </Panel>
  )
}

function AdviceBody({ advice }: { advice: CoachAdvice }) {
  return (
    <>
      <p className={styles.action} data-action={advice.action}>
        {ACTION_LABEL[advice.action]}
        <span className={styles.confidence}>{Math.round(advice.confidence * 100)}%</span>
      </p>
      {advice.suggestedLimit !== null ? (
        <p className={styles.limit}>Limit {formatPrice(advice.suggestedLimit)}</p>
      ) : null}
      <ul className={styles.reasons}>
        {advice.reasons.map((reason, index) => (
          <li key={`${index}-${reason}`}>{reason}</li>
        ))}
      </ul>
    </>
  )
}
