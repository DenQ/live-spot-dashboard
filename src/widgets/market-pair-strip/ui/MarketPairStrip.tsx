import { useCallback, useState } from 'react'

import { useMarketFeed, useQuotes, useSparkSeries } from '@features/market-feed'
import { formatPct, formatPrice } from '@shared/lib'

import { CompareFloat } from './CompareFloat'
import { Sparkline } from './Sparkline'
import styles from './MarketPairStrip.module.css'

const EMPTY_SPARK: number[] = []

export function MarketPairStrip() {
  const { instruments, symbol, setSymbol } = useMarketFeed()
  const quotesById = useQuotes()
  const { barsById, closesById } = useSparkSeries()
  const [compareOpen, setCompareOpen] = useState(false)
  const closeCompare = useCallback(() => setCompareOpen(false), [])

  return (
    <div className={styles.row}>
      <div className={styles.grid}>
        {instruments.map((instrument) => {
          const quote = quotesById[instrument.id]
          const selected = instrument.id === symbol
          const changePct = quote?.changePct
          const spark = closesById[instrument.id] ?? EMPTY_SPARK
          const up =
            typeof changePct === 'number' && Number.isFinite(changePct)
              ? changePct >= 0
              : spark.length >= 2
                ? spark[spark.length - 1] >= spark[0]
                : true

          return (
            <button
              key={instrument.id}
              type="button"
              className={styles.chip}
              data-testid={`pair-chip-${instrument.id}`}
              data-selected={selected || undefined}
              data-side={up ? 'up' : 'down'}
              aria-pressed={selected}
              aria-label={`Chart ${instrument.ticker}`}
              onClick={() => setSymbol(instrument.id)}
            >
              <span className={styles.head}>
                <span className={styles.ticker}>{instrument.ticker}</span>
                <span className={styles.change} data-side={up ? 'up' : 'down'}>
                  {quote ? formatPct(quote.changePct) : '—'}
                </span>
              </span>
              <span className={styles.last}>{quote ? formatPrice(quote.last) : '—'}</span>
              <span className={styles.spark}>
                <Sparkline values={spark} up={up} />
              </span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        className={styles.compare}
        data-testid="pair-compare-open"
        aria-expanded={compareOpen}
        aria-controls="pair-compare-float"
        onClick={() => setCompareOpen((open) => !open)}
      >
        Compare
      </button>
      {compareOpen ? (
        <CompareFloat
          instruments={instruments}
          barsById={barsById}
          symbol={symbol}
          onSelect={setSymbol}
          onClose={closeCompare}
        />
      ) : null}
    </div>
  )
}
