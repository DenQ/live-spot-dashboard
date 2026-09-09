import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import type { Instrument } from '@entities/instrument'
import { useSparkSeries, type SparkBar, type SparkInterval } from '@features/market-feed'
import { cx, formatPct } from '@shared/lib'

import { pairColor } from '../model/pair-color'
import { lastPercent } from '../model/percent-line'
import { CompareChart } from './CompareChart'
import styles from './CompareFloat.module.css'

type CompareFloatProps = {
  instruments: readonly Instrument[]
  barsById: Record<string, SparkBar[]>
  symbol: string
  onSelect: (id: string) => void
  onClose: () => void
}

const PANEL_WIDTH = 720
const TABS: { id: SparkInterval; label: string }[] = [
  { id: '1h', label: '1h' },
  { id: '1m', label: '1m' },
]

export function CompareFloat({ instruments, barsById, symbol, onSelect, onClose }: CompareFloatProps) {
  const panelRef = useRef<HTMLElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [range, setRange] = useState<SparkInterval>('1h')
  const minute = useSparkSeries('1m', range === '1m')
  const series = range === '1m' ? minute.barsById : barsById

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function onDragStart(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('button')) {
      return
    }

    const panel = panelRef.current
    if (!panel) {
      return
    }

    const rect = panel.getBoundingClientRect()
    const offsetX = event.clientX - rect.left
    const offsetY = event.clientY - rect.top
    setPos({ left: rect.left, top: rect.top })

    const onMove = (move: PointerEvent) => {
      const maxLeft = Math.max(8, window.innerWidth - PANEL_WIDTH - 8)
      const maxTop = Math.max(8, window.innerHeight - 72)
      setPos({
        left: Math.min(maxLeft, Math.max(8, move.clientX - offsetX)),
        top: Math.min(maxTop, Math.max(8, move.clientY - offsetY)),
      })
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <section
      ref={panelRef}
      className={styles.root}
      style={pos ? { left: pos.left, top: pos.top, right: 'auto', bottom: 'auto' } : undefined}
      id="pair-compare-float"
      role="dialog"
      aria-modal="false"
      aria-labelledby="pair-compare-title"
      data-testid="pair-compare-float"
    >
      <header className={styles.head} onPointerDown={onDragStart}>
        <h2 id="pair-compare-title" className={styles.title}>
          Compare
        </h2>
        <div className={styles.tabs} role="tablist" aria-label="Compare interval">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={styles.tab}
              data-testid={`pair-compare-tab-${tab.id}`}
              aria-selected={range === tab.id}
              onClick={() => setRange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button type="button" className={styles.close} onClick={onClose} data-testid="pair-compare-close">
          Close
        </button>
      </header>
      <CompareChart instruments={instruments} barsById={series} symbol={symbol} rangeKey={range} />
      <div className={styles.legend}>
        {instruments.map((instrument) => {
          const selected = instrument.id === symbol
          const pct = lastPercent(series[instrument.id] ?? [])
          const up = (pct ?? 0) >= 0

          return (
            <button
              key={instrument.id}
              type="button"
              className={cx(styles.item, selected && styles.selected)}
              data-testid={`pair-compare-${instrument.id}`}
              data-selected={selected || undefined}
              aria-pressed={selected}
              onClick={() => onSelect(instrument.id)}
            >
              <span className={styles.swatch} style={{ background: pairColor(instrument.id) }} />
              <span className={styles.ticker}>{instrument.ticker}</span>
              <span className={styles.pct} data-side={up ? 'up' : 'down'}>
                {pct === undefined ? '—' : formatPct(pct)}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
