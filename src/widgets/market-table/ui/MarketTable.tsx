import { useMarketFeed, useQuotes } from '@features/market-feed'
import { formatPct, formatPrice, formatVolume } from '@shared/lib'
import { Panel } from '@shared/ui'

import styles from './MarketTable.module.css'

export function MarketTable() {
  const { instruments, symbol, setSymbol, quoteStatus, quoteError } = useMarketFeed()
  const quotesById = useQuotes()

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
              </tr>
            </thead>
            <tbody>
              {instruments.map((instrument) => {
                const quote = quotesById[instrument.id]
                const selected = instrument.id === symbol
                const up = (quote?.changePct ?? 0) >= 0

                return (
                  <tr
                    key={instrument.id}
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
