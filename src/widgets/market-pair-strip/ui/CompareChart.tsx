import { useEffect, useRef } from 'react'

import type { Instrument } from '@entities/instrument'
import type { SparkBar } from '@features/market-feed'
import {
  ColorType,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts'

import { pairColor } from '../model/pair-color'
import { toPercentLine } from '../model/percent-line'
import styles from './CompareChart.module.css'

type CompareChartProps = {
  instruments: readonly Instrument[]
  barsById: Record<string, SparkBar[]>
  symbol: string
}

function token(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

export function CompareChart({ instruments, barsById, symbol }: CompareChartProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map())
  const fittedRef = useRef(false)

  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      return
    }

    const muted = token('--text-muted', '#b197c4')
    const up = token('--up', '#3df0ff')
    const down = token('--down', '#ff2ee6')

    const chart = createChart(host, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: muted,
        fontFamily: 'IBM Plex Sans, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255, 46, 230, 0.08)' },
        horzLines: { color: 'rgba(61, 240, 255, 0.06)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 46, 230, 0.22)',
      },
      timeScale: {
        borderColor: 'rgba(61, 240, 255, 0.22)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: up, labelBackgroundColor: down },
        horzLine: { color: down, labelBackgroundColor: up },
      },
      localization: {
        priceFormatter: (value: number) => `${value.toFixed(1)}%`,
      },
    })

    const series = new Map<string, ISeriesApi<'Line'>>()

    for (const instrument of instruments) {
      series.set(
        instrument.id,
        chart.addSeries(LineSeries, {
          color: pairColor(instrument.id),
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        }),
      )
    }

    chartRef.current = chart
    seriesRef.current = series
    fittedRef.current = false

    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = new Map()
    }
  }, [instruments])

  useEffect(() => {
    let hasData = false

    for (const instrument of instruments) {
      const line = toPercentLine(barsById[instrument.id] ?? [])
      if (line.length > 1) {
        hasData = true
      }

      seriesRef.current.get(instrument.id)?.setData(line)
    }

    if (hasData && !fittedRef.current) {
      chartRef.current?.timeScale().fitContent()
      fittedRef.current = true
    }
  }, [barsById, instruments])

  useEffect(() => {
    for (const instrument of instruments) {
      seriesRef.current.get(instrument.id)?.applyOptions({
        lineWidth: instrument.id === symbol ? 3 : 1,
        lastValueVisible: instrument.id === symbol,
        color: pairColor(instrument.id),
      })
    }
  }, [instruments, symbol])

  return <div ref={hostRef} className={styles.chart} data-testid="pair-compare-chart" />
}
