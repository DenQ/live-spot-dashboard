import { toRowHint } from '@features/coach/model/row-hint'
import { useCoach } from '@features/coach/model/use-coach'
import { HintBadge } from '@features/coach/ui/HintBadge'
import { useMarketFeed, useQuotes } from '@features/market-feed'
import { usePaperTrading } from '@features/paper-trading/model/use-paper-trading'
import { formatPct, formatPrice, formatVolume } from '@shared/lib'
import { Panel } from '@shared/ui'

import styles from './MarketTable.module.css'

export function MarketTable() {
  const { instruments, symbol, setSymbol, quoteStatus, quoteError } = useMarketFeed()
  const quotesById = useQuotes()
  const { hintsEnabled, adviceById } = useCoach()
  const { account } = usePaperTrading()

  return (
    <Panel title="Pairs" hint="Select to chart">
      <div className={styles.wrap}>
        {quoteStatus === 'error' ? (
          <p className={styles.message}>{quoteError}</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Last</th>
                <th>Change</th>
                <th>Volume</th>
                {hintsEnabled ? <th>Hint</th> : null}
              </tr>
            </thead>
            <tbody>
              {instruments.map((instrument) => {
                const quote = quotesById[instrument.id]
                const selected = instrument.id === symbol
                const up = (quote?.changePct ?? 0) >= 0
                const held = (account.positions[instrument.id]?.qty ?? 0) > 0
                const hint = hintsEnabled ? toRowHint(adviceById[instrument.id], held) : null

                return (
                  <tr
                    key={instrument.id}
                    data-testid={`pair-${instrument.id}`}
                    data-selected={selected || undefined}
                    tabIndex={0}
                    aria-selected={selected}
                    onClick={() => setSymbol(instrument.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSymbol(instrument.id)
                      }
                    }}
                  >
                    <td>
                      <span className={styles.ticker}>{instrument.ticker}</span>
                      <span className={styles.name}>{instrument.name}</span>
                    </td>
                    <td className={styles.num}>{quote ? formatPrice(quote.last) : '—'}</td>
                    <td className={styles.num} data-side={up ? 'up' : 'down'}>
                      {quote ? formatPct(quote.changePct) : '—'}
                    </td>
                    <td className={styles.num}>{quote ? formatVolume(quote.volume) : '—'}</td>
                    {hintsEnabled ? (
                      <td
                        className={styles.hint}
                        data-testid={`pair-hint-${instrument.id}`}
                        title={adviceById[instrument.id]?.reasons.join(' · ')}
                      >
                        {hint ? (
                          <HintBadge hint={hint} />
                        ) : (
                          <span className={styles.pending}>—</span>
                        )}
                      </td>
                    ) : null}
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
