import { PAPER } from '@shared/config'
import { cx, formatPct, formatUsd } from '@shared/lib'

import { usePaperTrading } from '../model/use-paper-trading'
import styles from './EquityStrip.module.css'

export function EquityStrip() {
  const { account, equity, unrealized, reset } = usePaperTrading()
  const pnlPct = (equity - PAPER.startingCash) / PAPER.startingCash
  const up = unrealized >= 0
  const equityUp = equity >= PAPER.startingCash

  return (
    <section className={styles.root}>
      <Stat label="Cash" value={formatUsd(account.cash)} />
      <Stat label="Equity" value={formatUsd(equity)} tone={equityUp ? 'up' : 'down'} />
      <Stat label="Unrealized" value={formatUsd(unrealized)} tone={up ? 'up' : 'down'} />
      <Stat label="Vs start" value={formatPct(pnlPct * 100)} tone={equityUp ? 'up' : 'down'} />
      <button
        type="button"
        className={styles.reset}
        onClick={() => {
          if (window.confirm('Reset paper account to $1,000? Open orders will be cleared.')) {
            reset()
          }
        }}
      >
        Reset $1,000
      </button>
    </section>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className={styles.stat}>
      <span className={styles.label}>{label}</span>
      <span className={cx(styles.value, tone && styles[tone])}>{value}</span>
    </div>
  )
}
