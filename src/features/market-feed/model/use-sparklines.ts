import { useEffect, useState } from 'react'

import type { Instrument } from '@entities/instrument'
import type { Quote } from '@entities/quote'
import { createMarketFeed } from '@shared/api'
import type { MarketProviderId } from '@shared/config'

import { getLiveQuotes } from './quotes-store'
import { useMarketFeed } from './use-market-feed'

const SPARKLINE_LIMIT = 24
const LIVE_LAST_MS = 1000
const SNAPSHOT_MS = 20_000

const cache = new Map<MarketProviderId, Record<string, number[]>>()
const inflight = new Map<MarketProviderId, Promise<Record<string, number[]>>>()

function sameSeries(left: number[] | undefined, right: number[]) {
  if (left === right) {
    return true
  }

  if (!left || left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false
    }
  }

  return true
}

/** Replace the forming close with `quote.last` without allocating when nothing moved. */
export function overlaySparklineLast(
  snapshot: Record<string, number[]>,
  quotes: Record<string, Quote>,
  prev: Record<string, number[]>,
) {
  const ids = Object.keys(snapshot)
  let changed = ids.length !== Object.keys(prev).length
  const next: Record<string, number[]> = {}

  for (const id of ids) {
    const values = snapshot[id]
    const last = quotes[id]?.last
    const live = typeof last === 'number' && Number.isFinite(last) ? last : undefined
    const series =
      values.length === 0 || live === undefined || values[values.length - 1] === live
        ? values
        : values.slice(0, -1).concat(live)

    if (sameSeries(prev[id], series)) {
      next[id] = prev[id]
    } else {
      next[id] = series
      changed = true
    }
  }

  return changed ? next : prev
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
        return [instrument.id, candles.map((candle) => candle.close)] as const
      } catch {
        return [instrument.id, [] as number[]] as const
      }
    }),
  ).then((entries) => {
    const previous = cache.get(providerId) ?? {}
    const next = { ...previous }

    for (const [id, closes] of entries) {
      if (closes.length > 0) {
        next[id] = closes
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

export function useSparklines() {
  const { providerId, instruments } = useMarketFeed()
  const [closesById, setClosesById] = useState<Record<string, number[]>>(() => {
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

      setClosesById((prev) => overlaySparklineLast(snapshot, getLiveQuotes(), prev))
    }

    const cached = cache.get(providerId)
    if (cached) {
      paint()
    } else {
      setClosesById({})
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

  return closesById
}
