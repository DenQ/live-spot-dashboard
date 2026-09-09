import { useEffect, useMemo, useState } from 'react'

import type { Instrument } from '@entities/instrument'
import type { Quote } from '@entities/quote'
import { createMarketFeed } from '@shared/api'
import type { MarketProviderId } from '@shared/config'

import { getLiveQuotes } from './quotes-store'
import { useMarketFeed } from './use-market-feed'

export type SparkBar = {
  time: number
  close: number
}

const SPARKLINE_LIMIT = 24
const LIVE_LAST_MS = 1000
const SNAPSHOT_MS = 20_000

const cache = new Map<MarketProviderId, Record<string, SparkBar[]>>()
const inflight = new Map<MarketProviderId, Promise<Record<string, SparkBar[]>>>()

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
  force = false,
) {
  if (!force) {
    const cached = cache.get(providerId)
    if (cached) {
      return Promise.resolve(cached)
    }
  }

  const pending = inflight.get(providerId)
  if (pending) {
    return pending
  }

  const feed = createMarketFeed(providerId)
  const request = Promise.all(
    instruments.map(async (instrument) => {
      try {
        const candles = await feed.fetchCandles(instrument.id, { limit: SPARKLINE_LIMIT })
        return [
          instrument.id,
          candles.map((candle) => ({ time: candle.time, close: candle.close })),
        ] as const
      } catch {
        return [instrument.id, [] as SparkBar[]] as const
      }
    }),
  ).then((entries) => {
    const previous = cache.get(providerId) ?? {}
    const next = { ...previous }

    for (const [id, bars] of entries) {
      if (bars.length > 0) {
        next[id] = bars
      } else if (!(id in next)) {
        next[id] = []
      }
    }

    cache.set(providerId, next)
    inflight.delete(providerId)
    return next
  })

  inflight.set(providerId, request)
  return request
}

export function useSparkSeries() {
  const { providerId, instruments } = useMarketFeed()
  const [barsById, setBarsById] = useState<Record<string, SparkBar[]>>(() => {
    const cached = cache.get(providerId)
    return cached ? overlaySparklineLast(cached, getLiveQuotes(), {}) : {}
  })

  useEffect(() => {
    let cancelled = false

    const paint = () => {
      const snapshot = cache.get(providerId)
      if (!snapshot) {
        return
      }

      setBarsById((prev) => overlaySparklineLast(snapshot, getLiveQuotes(), prev))
    }

    const cached = cache.get(providerId)
    if (cached) {
      paint()
    } else {
      setBarsById({})
    }

    const run = (force: boolean) => {
      void loadSparklines(providerId, instruments, force).then(() => {
        if (!cancelled) {
          paint()
        }
      })
    }

    const idleId = window.requestIdleCallback?.(() => run(Boolean(cached)), { timeout: 1500 })
    const timer = idleId === undefined ? window.setTimeout(() => run(Boolean(cached)), 0) : undefined
    const liveId = window.setInterval(paint, LIVE_LAST_MS)
    const refreshId = window.setInterval(() => run(true), SNAPSHOT_MS)

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
  }, [instruments, providerId])

  const closesById = useMemo(() => sparkClosesById(barsById), [barsById])

  return { barsById, closesById }
}

export function useSparklines() {
  return useSparkSeries().closesById
}
