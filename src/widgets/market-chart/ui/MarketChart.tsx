import { useEffect, useRef } from 'react'

import type { Candle } from '@entities/candle'
import { getCandles, subscribeLiveCandle, useMarketFeed } from '@features/market-feed'
import { Panel } from '@shared/ui'
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'

import styles from './MarketChart.module.css'

function token(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function toCandlePoint(item: Candle) {
  return {
    time: item.time as UTCTimestamp,
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
  }
}

function toVolumePoint(item: Candle) {
  return {
    time: item.time as UTCTimestamp,
    value: item.volume,
    color: item.close >= item.open ? 'rgba(61, 240, 255, 0.5)' : 'rgba(255, 46, 230, 0.5)',
  }
}

export function MarketChart() {
  const { symbol, instruments, candleStatus, candleError, providerId } = useMarketFeed()
  const hostRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  const instrument = instruments.find((item) => item.id === symbol)
  const hint = instrument ? `${instrument.ticker} · 1h` : '—'

  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      return
    }

    const up = token('--up', '#3df0ff')
    const down = token('--down', '#ff2ee6')
    const muted = token('--text-muted', '#b197c4')

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
      rightPriceScale: { borderColor: 'rgba(255, 46, 230, 0.22)' },
      timeScale: {
        borderColor: 'rgba(61, 240, 255, 0.22)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: up, labelBackgroundColor: down },
        horzLine: { color: down, labelBackgroundColor: up },
      },
    })

    candleRef.current = chart.addSeries(CandlestickSeries, {
      upColor: up,
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: up,
      wickDownColor: down,
    })

    volumeRef.current = chart.addSeries(
      HistogramSeries,
      {
        priceFormat: { type: 'volume' },
      },
      1,
    )

    chartRef.current = chart

    return () => {
      chart.remove()
      chartRef.current = null
      candleRef.current = null
      volumeRef.current = null
    }
  }, [providerId])

  useEffect(() => {
    const candleSeries = candleRef.current
    const volumeSeries = volumeRef.current

    if (!candleSeries || !volumeSeries) {
      return
    }

    if (candleStatus === 'connecting') {
      candleSeries.setData([])
      volumeSeries.setData([])
      return
    }

    if (candleStatus !== 'live') {
      return
    }

    const history = getCandles()
    candleSeries.setData(history.map(toCandlePoint))
    volumeSeries.setData(history.map(toVolumePoint))

    if (history.length > 0) {
      chartRef.current?.timeScale().fitContent()
    }

    return subscribeLiveCandle((candle) => {
      candleSeries.update(toCandlePoint(candle))
      volumeSeries.update(toVolumePoint(candle))
    })
  }, [candleStatus, providerId, symbol])

  return (
    <Panel title="Chart" hint={hint}>
      <div className={styles.body}>
        {candleStatus === 'error' && candleError ? <p className={styles.message}>{candleError}</p> : null}
        {candleStatus === 'connecting' ? <p className={styles.message}>Loading…</p> : null}
        <div ref={hostRef} className={styles.chart} />
      </div>
    </Panel>
  )
}
