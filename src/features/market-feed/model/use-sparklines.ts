import { useEffect, useMemo, useState } from 'react'

import type { Instrument } from '@entities/instrument'
import type { Quote } from '@entities/quote'
import { createMarketFeed, type CandleInterval } from '@shared/api'
import type { MarketProviderId } from '@shared/config'

import { getLiveQuotes } from './quotes-store'
import { useMarketFeed } from './use-market-feed'

export type SparkBar = {
  time: number
  close: number
}

export type SparkInterval = CandleInterval

const LIVE_LAST_MS = 1000
const SPARK_LIMIT: Record<SparkInterval, number> = { '1h': 24, '1m': 60 }
const SNAPSHOT_MS: Record<SparkInterval, number> = { '1h': 20_000, '1m': 10_000 }

type CacheKey = `${MarketProviderId}:${SparkInterval}`

const cache = new Map<CacheKey, Record<string, SparkBar[]>>()
const inflight = new Map<CacheKey, Promise<Record<string, SparkBar[]>>>()

function toCacheKey(providerId: MarketProviderId, interval: SparkInterval): CacheKey {
  return `${providerId}:${interval}`
}

function sameBars(left: SparkBar[] | undefined, right: SparkBar[]) {
  if (left === right) {
    return true
  }

  if (!left || left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index].time !== right[index].time || left[index].close !== right[index].close) {
      return false
    }
  }

  return true
}

/** Replace the forming close with `quote.last` without allocating when nothing moved. */
export function overlaySparklineLast(
  snapshot: Record<string, SparkBar[]>,
  quotes: Record<string, Quote>,
  prev: Record<string, SparkBar[]>,
) {
  const ids = Object.keys(snapshot)
  let changed = ids.length !== Object.keys(prev).length
  const next: Record<string, SparkBar[]> = {}

  for (const id of ids) {
    const values = snapshot[id]
    const last = quotes[id]?.last
    const live = typeof last === 'number' && Number.isFinite(last) ? last : undefined
    const tail = values[values.length - 1]
    const series =
      values.length === 0 || live === undefined || tail.close === live
        ? values
        : values.slice(0, -1).concat({ time: tail.time, close: live })

    if (sameBars(prev[id], series)) {
      next[id] = prev[id]
    } else {
      next[id] = series
      changed = true
    }
  }

  return changed ? next : prev
}

export function sparkClosesById(barsById: Record<string, SparkBar[]>) {
  const next: Record<string, number[]> = {}

  for (const [id, bars] of Object.entries(barsById)) {
    next[id] = bars.map((bar) => bar.close)
  }

  return next
}

function loadSparklines(
  providerId: MarketProviderId,
  instruments: readonly Instrument[],
  interval: SparkInterval,
  force = false,
) {
  const key = toCacheKey(providerId, interval)

  if (!force) {
    const cached = cache.get(key)
    if (cached) {
      return Promise.resolve(cached)
    }
  }

  const pending = inflight.get(key)
  if (pending) {
    return pending
  }

  const feed = createMarketFeed(providerId)
  const request = Promise.all(
    instruments.map(async (instrument) => {
      try {
        const candles = await feed.fetchCandles(instrument.id, {
          limit: SPARK_LIMIT[interval],
          interval,
        })
        return [
          instrument.id,
          candles.map((candle) => ({ time: candle.time, close: candle.close })),
        ] as const
      } catch {
        return [instrument.id, [] as SparkBar[]] as const
      }
    }),
  ).then((entries) => {
    const previous = cache.get(key) ?? {}
    const next = { ...previous }

    for (const [id, bars] of entries) {
      if (bars.length > 0) {
        next[id] = bars
      } else if (!(id in next)) {
        next[id] = []
      }
    }

    cache.set(key, next)
    inflight.delete(key)
    return next
  })

  inflight.set(key, request)
  return request
}

const EMPTY_BARS: Record<string, SparkBar[]> = {}

export function useSparkSeries(interval: SparkInterval = '1h', enabled = true) {
  const { providerId, instruments } = useMarketFeed()
  const key = toCacheKey(providerId, interval)
  const [held, setHeld] = useState<{ key: CacheKey; bars: Record<string, SparkBar[]> } | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false
    const cacheKey = toCacheKey(providerId, interval)

    const paint = () => {
      const snapshot = cache.get(cacheKey)
      if (!snapshot || cancelled) {
        return
      }

      setHeld((prev) => {
        const nextBars = overlaySparklineLast(
          snapshot,
          getLiveQuotes(),
          prev?.key === cacheKey ? prev.bars : {},
        )

        if (prev?.key === cacheKey && nextBars === prev.bars) {
          return prev
        }

        return { key: cacheKey, bars: nextBars }
      })
    }

    const run = (force: boolean) => {
      void loadSparklines(providerId, instruments, interval, force).then(() => {
        if (!cancelled) {
          paint()
        }
      })
    }

    const cached = cache.get(cacheKey)
    const idleId = window.requestIdleCallback?.(() => run(Boolean(cached)), { timeout: 1500 })
    const timer = idleId === undefined ? window.setTimeout(() => run(Boolean(cached)), 0) : undefined
    const liveId = window.setInterval(paint, LIVE_LAST_MS)
    const refreshId = window.setInterval(() => run(true), SNAPSHOT_MS[interval])

    return () => {
      cancelled = true
      if (idleId !== undefined) {
        window.cancelIdleCallback(idleId)
      }
      if (timer !== undefined) {
        window.clearTimeout(timer)
      }
      window.clearInterval(liveId)
      window.clearInterval(refreshId)
    }
  }, [enabled, instruments, interval, providerId])

  const barsById = enabled && held?.key === key ? held.bars : EMPTY_BARS
  const closesById = useMemo(() => sparkClosesById(barsById), [barsById])

  return { barsById, closesById }
}

export function useSparklines() {
  return useSparkSeries().closesById
}
