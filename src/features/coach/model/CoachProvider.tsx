import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import type { Candle } from '@entities/candle'
import type { CoachAdvice } from '@entities/coach'
import { getCandles, getLiveQuotes, subscribeLiveCandle, useMarketFeed } from '@features/market-feed'
import { usePaperTrading } from '@features/paper-trading/model/use-paper-trading'
import { createMarketFeed } from '@shared/api'

import { playHintChime, unlockHintChime } from '../lib/chime'
import { actionableKeys, shouldPlayOffscreenHint } from './actionable'
import { CoachContext } from './context'
import { createCoachEngine } from './create-engine'
import { buildCoachRequest } from './snapshot'
import { persistHintsEnabled, readHintsEnabled } from './storage'

const DEBOUNCE_MS = 1500
const POLL_MS = 2000
const BOOK_MS = 20_000
const EMPTY_BOOK: Record<string, CoachAdvice> = {}

function isSameAdvice(left: CoachAdvice | null, right: CoachAdvice): boolean {
  return (
    left !== null &&
    left.regime === right.regime &&
    left.action === right.action &&
    left.confidence === right.confidence &&
    left.suggestedLimit === right.suggestedLimit &&
    left.asOf === right.asOf &&
    left.reasons.length === right.reasons.length &&
    left.reasons.every((reason, index) => reason === right.reasons[index])
  )
}

export function CoachProvider({ children }: { children: ReactNode }) {
  const engine = useMemo(() => createCoachEngine(), [])
  const { providerId, instruments, symbol, candleStatus } = useMarketFeed()
  const feed = useMemo(() => createMarketFeed(providerId), [providerId])
  const { account } = usePaperTrading()
  const [hintsEnabled, setHintsEnabledState] = useState(readHintsEnabled)
  const [book, setBook] = useState<Record<string, CoachAdvice>>({})
  const [error, setError] = useState<string | null>(null)
  const heardKeys = useRef<string[]>([])
  const instrumentIds = useMemo(() => instruments.map((item) => item.id), [instruments])
  const qtyById = useMemo(() => {
    const next: Record<string, number> = {}
    for (const id of instrumentIds) {
      next[id] = account.positions[id]?.qty ?? 0
    }
    return next
  }, [account.positions, instrumentIds])
  const positionQty = qtyById[symbol] ?? 0

  const setHintsEnabled = useCallback((enabled: boolean) => {
    setHintsEnabledState(enabled)
    persistHintsEnabled(enabled)
  }, [])

  const putAdvice = useCallback((instrumentId: string, next: CoachAdvice) => {
    setBook((current) => {
      if (isSameAdvice(current[instrumentId] ?? null, next)) {
        return current
      }

      return { ...current, [instrumentId]: next }
    })
  }, [])

  useEffect(() => {
    if (!hintsEnabled || candleStatus !== 'live') {
      return
    }

    let cancelled = false
    let throttle: ReturnType<typeof setTimeout> | undefined
    let inFlight = false
    let queued = false

    async function run() {
      if (cancelled) {
        return
      }

      if (inFlight) {
        queued = true
        return
      }

      const candles = getCandles()
      const last = getLiveQuotes()[symbol]?.last

      if (typeof last !== 'number' || !Number.isFinite(last) || candles.length === 0) {
        return
      }

      inFlight = true
      const snapshot = buildCoachRequest({
        instrumentId: symbol,
        last,
        positionQty,
        candles,
      })

      try {
        const next = await engine.decide(snapshot)
        if (!cancelled) {
          putAdvice(symbol, next)
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Coach failed')
        }
      } finally {
        inFlight = false
        if (queued && !cancelled) {
          queued = false
          schedule()
        }
      }
    }

    function schedule() {
      if (throttle !== undefined) {
        return
      }

      throttle = setTimeout(() => {
        throttle = undefined
        void run()
      }, DEBOUNCE_MS)
    }

    void run()
    const unsubscribe = subscribeLiveCandle(schedule)
    const poll = window.setInterval(schedule, POLL_MS)

    return () => {
      cancelled = true
      unsubscribe()
      window.clearInterval(poll)
      if (throttle !== undefined) {
        clearTimeout(throttle)
      }
    }
  }, [candleStatus, engine, hintsEnabled, positionQty, putAdvice, symbol])

  useEffect(() => {
    if (!hintsEnabled) {
      return
    }

    let cancelled = false

    async function scan() {
      const quotes = getLiveQuotes()
      const liveCandles = getCandles()

      await Promise.all(
        instrumentIds.map(async (instrumentId) => {
          const last = quotes[instrumentId]?.last
          if (typeof last !== 'number' || !Number.isFinite(last)) {
            return
          }

          let candles: Candle[]
          if (instrumentId === symbol && liveCandles.length > 0) {
            candles = liveCandles
          } else {
            try {
              candles = await feed.fetchCandles(instrumentId)
            } catch {
              return
            }
          }

          if (cancelled || candles.length === 0) {
            return
          }

          try {
            const next = await engine.decide(
              buildCoachRequest({
                instrumentId,
                last,
                positionQty: qtyById[instrumentId] ?? 0,
                candles,
              }),
            )
            if (!cancelled) {
              putAdvice(instrumentId, next)
            }
          } catch {
            // keep the last good hint for this pair
          }
        }),
      )
    }

    void scan()
    const timer = window.setInterval(() => {
      void scan()
    }, BOOK_MS)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [engine, feed, hintsEnabled, instrumentIds, putAdvice, qtyById, symbol])

  useEffect(() => {
    const unlock = () => unlockHintChime()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (!hintsEnabled) {
      heardKeys.current = []
      return
    }

    const currentKeys = actionableKeys(book, qtyById)
    if (
      shouldPlayOffscreenHint({
        hintsEnabled,
        hidden: document.visibilityState === 'hidden',
        previousKeys: heardKeys.current,
        currentKeys,
      })
    ) {
      playHintChime()
    }
    heardKeys.current = currentKeys
  }, [book, hintsEnabled, qtyById])

  const visibleAdvice = hintsEnabled ? (book[symbol] ?? null) : null
  const visibleError = hintsEnabled ? error : null
  const adviceById = hintsEnabled ? book : EMPTY_BOOK

  const value = useMemo(
    () => ({
      hintsEnabled,
      setHintsEnabled,
      advice: visibleAdvice,
      adviceById,
      error: visibleError,
    }),
    [adviceById, hintsEnabled, setHintsEnabled, visibleAdvice, visibleError],
  )

  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>
}
