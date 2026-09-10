import { useEffect, useRef } from 'react'

import type { Instrument } from '@entities/instrument'
import type { SparkBar } from '@features/market-feed'
import { readChartPalette, useDocumentTheme } from '@shared/lib'
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
  rangeKey: string
}

export function CompareChart({ instruments, barsById, symbol, rangeKey }: CompareChartProps) {
  const theme = useDocumentTheme()
  const hostRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map())
  const fittedRef = useRef(false)

  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      return
    }

    const palette = readChartPalette()

    const chart = createChart(host, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: palette.text,
        fontFamily: 'IBM Plex Sans, sans-serif',
      },
      grid: {
        vertLines: { color: palette.gridVert },
        horzLines: { color: palette.gridHorz },
      },
      rightPriceScale: {
        borderColor: palette.borderY,
      },
      timeScale: {
        borderColor: palette.borderX,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: palette.up, labelBackgroundColor: palette.down },
        horzLine: { color: palette.down, labelBackgroundColor: palette.up },
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
  }, [instruments, theme])

  useEffect(() => {
    fittedRef.current = false
  }, [rangeKey])

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
  }, [barsById, instruments, rangeKey, theme])

  useEffect(() => {
    for (const instrument of instruments) {
      seriesRef.current.get(instrument.id)?.applyOptions({
        lineWidth: instrument.id === symbol ? 3 : 1,
        lastValueVisible: instrument.id === symbol,
        color: pairColor(instrument.id),
      })
    }
  }, [instruments, symbol, theme])

  return <div ref={hostRef} className={styles.chart} data-testid="pair-compare-chart" />
}
