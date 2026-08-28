import { formatPrice, formatQty, formatUsd } from '@shared/lib'
import { Panel } from '@shared/ui'

import { usePaperTrading } from '../model/use-paper-trading'
import styles from './LedgerTable.module.css'

export function LedgerTable() {
  const { account } = usePaperTrading()
  const rows = account.ledger

  return (
    <Panel title="Ledger" hint="Fills, misses, cancels">
      <div className={styles.wrap}>
        {rows.length === 0 ? (
          <p className={styles.empty}>Trades will list here after the first fill or miss.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Pair</th>
                <th>Side</th>
                <th>Qty</th>
                <th>Limit</th>
                <th>Fill</th>
                <th>Fee</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.id}>
                  <td className={styles.num}>{formatTime(entry.at)}</td>
                  <td>{entry.ticker}</td>
                  <td data-side={entry.side}>{entry.side}</td>
                  <td className={styles.num}>{formatQty(entry.qty)}</td>
                  <td className={styles.num}>{formatPrice(entry.limit)}</td>
                  <td className={styles.num}>{entry.fillPrice == null ? '—' : formatPrice(entry.fillPrice)}</td>
                  <td className={styles.num}>{entry.fee == null ? '—' : formatUsd(entry.fee)}</td>
                  <td>
                    <span className={styles.status} data-status={entry.status}>
                      {entry.status}
                      {entry.reason ? ` · ${entry.reason}` : ''}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Panel>
  )
}

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
