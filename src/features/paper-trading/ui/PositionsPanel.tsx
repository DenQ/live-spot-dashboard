import { useMarketFeed } from '@features/market-feed'
import { formatPct, formatPrice, formatQty, formatUsd } from '@shared/lib'
import { Panel } from '@shared/ui'

import { usePaperTrading } from '../model/use-paper-trading'
import styles from './PositionsPanel.module.css'

export function PositionsPanel() {
  const { quotesById, instruments, setSymbol } = useMarketFeed()
  const { account, freeQty, prefillTicket } = usePaperTrading()
  const rows = Object.values(account.positions)

  const selectPosition = (instrumentId: string) => {
    const sellable = freeQty(instrumentId)
    const position = account.positions[instrumentId]
    prefillTicket(instrumentId, sellable > 0 ? sellable : (position?.qty ?? 0))
    setSymbol(instrumentId)
  }

  return (
    <Panel title="Portfolio" hint={rows.length ? `${rows.length} open` : 'Flat'}>
      <div className={styles.wrap}>
        {rows.length === 0 ? (
          <p className={styles.empty}>No positions. Buy from the ticket.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Qty</th>
                <th>Avg</th>
                <th>Last</th>
                <th>uPnL</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((position) => {
                const instrument = instruments.find((item) => item.id === position.instrumentId)
                const last = quotesById[position.instrumentId]?.last
                const value = Number.isFinite(last) ? last * position.qty : Number.NaN
                const cost = position.avgPrice * position.qty
                const pnl = value - cost
                const pnlPct = cost === 0 ? 0 : (pnl / cost) * 100
                const up = pnl >= 0

                return (
                  <tr
                    key={position.instrumentId}
                    tabIndex={0}
                    onClick={() => selectPosition(position.instrumentId)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        selectPosition(position.instrumentId)
                      }
                    }}
                  >
                    <td>
                      <span className={styles.ticker}>{instrument?.ticker ?? position.instrumentId}</span>
                      <span className={styles.name}>{formatUsd(value)}</span>
                    </td>
                    <td className={styles.num}>{formatQty(position.qty)}</td>
                    <td className={styles.num}>{formatPrice(position.avgPrice)}</td>
                    <td className={styles.num}>{Number.isFinite(last) ? formatPrice(last) : '—'}</td>
                    <td className={styles.num} data-side={up ? 'up' : 'down'}>
                      {Number.isFinite(pnl) ? `${formatUsd(pnl)} ${formatPct(pnlPct)}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </Panel>
  )
}
