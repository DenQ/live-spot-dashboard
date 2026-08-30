import type { Candle } from '@entities/candle'

import { upsertCandle } from './candles'

let candles: Candle[] = []
const liveListeners = new Set<(candle: Candle) => void>()

export function getCandles() {
  return candles
}

export function resetCandles() {
  candles = []
}

export function replaceCandles(history: Candle[]) {
  candles = history
}

export function applyLiveCandle(candle: Candle) {
  const next = upsertCandle(candles, candle)
  if (next === candles) {
    return
  }

  candles = next
  const last = next.at(-1)
  if (last) {
    for (const listener of liveListeners) {
      listener(last)
    }
  }
}

export function subscribeLiveCandle(listener: (candle: Candle) => void) {
  liveListeners.add(listener)
  return () => {
    liveListeners.delete(listener)
  }
}
