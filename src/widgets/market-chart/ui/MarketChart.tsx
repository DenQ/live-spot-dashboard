import { useEffect, useRef } from 'react'

import type { Candle } from '@entities/candle'
import { useCoach } from '@features/coach'
import { getCandles, subscribeLiveCandle, useMarketFeed } from '@features/market-feed'
import { Panel } from '@shared/ui'
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  createChart,
  createSeriesMarkers,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'

import { bindChartViewport, type ChartViewportBinder } from '../model/viewport-binder'
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
  const { hintsEnabled, advice } = useCoach()
  const hostRef = useRef<HTMLDivElement>(null)
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)
  const viewportRef = useRef<ChartViewportBinder | null>(null)

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

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: up,
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: up,
      wickDownColor: down,
    })
    candleRef.current = candleSeries

    volumeRef.current = chart.addSeries(
      HistogramSeries,
      {
        priceFormat: { type: 'volume' },
      },
      1,
    )

    markersRef.current = createSeriesMarkers(candleSeries, [])

    viewportRef.current = bindChartViewport(chart, host)

    return () => {
      viewportRef.current?.destroy()
      viewportRef.current = null
      markersRef.current?.detach()
      markersRef.current = null
      chart.remove()
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

    const viewport = viewportRef.current

    if (candleStatus === 'connecting') {
      if (getCandles().length === 0) {
        viewport?.replaceSeriesData(
          () => {
            candleSeries.setData([])
            volumeSeries.setData([])
          },
          { restore: false },
        )
      }
      return
    }

    if (candleStatus !== 'live') {
      return
    }

    const history = getCandles()
    viewport?.replaceSeriesData(() => {
      candleSeries.setData(history.map(toCandlePoint))
      volumeSeries.setData(history.map(toVolumePoint))
    })

    return subscribeLiveCandle((candle) => {
      candleSeries.update(toCandlePoint(candle))
      volumeSeries.update(toVolumePoint(candle))
    })
  }, [candleStatus, providerId, symbol])

  useEffect(() => {
    const markers = markersRef.current

    if (!markers) {
      return
    }

    if (!hintsEnabled || !advice || advice.action === 'wait') {
      markers.setMarkers([])
      return
    }

    const last = getCandles().at(-1)

    if (!last) {
      markers.setMarkers([])
      return
    }

    const buy = advice.action === 'buy'
    const marker: SeriesMarker<UTCTimestamp> = {
      time: last.time as UTCTimestamp,
      position: buy ? 'belowBar' : 'aboveBar',
      shape: buy ? 'arrowUp' : 'arrowDown',
      color: buy ? token('--up', '#3df0ff') : token('--down', '#ff2ee6'),
      text: buy ? 'BUY' : 'SELL',
    }

    markers.setMarkers([marker])
  }, [advice, candleStatus, hintsEnabled, providerId, symbol])

  return (
    <Panel title="Chart" hint={hint}>
      <div className={styles.body} data-testid="market-chart" aria-busy={candleStatus === 'connecting'}>
        {candleStatus === 'error' && candleError ? <p className={styles.message}>{candleError}</p> : null}
        {candleStatus === 'connecting' && getCandles().length === 0 ? (
          <p className={styles.message} data-testid="chart-loading" role="status">
            Loading…
          </p>
        ) : null}
        <div ref={hostRef} className={styles.chart} data-testid="chart-canvas" />
      </div>
    </Panel>
  )
}
