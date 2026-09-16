import type { Candle } from '@entities/candle'

export function snapFillToCandleTime(candles: Candle[], atMs: number): number | null {
  if (!Number.isFinite(atMs) || candles.length === 0) {
    return null
  }

  const atSec = Math.floor(atMs / 1000)

  if (atSec < candles[0].time) {
    return null
  }

  for (let index = candles.length - 1; index >= 0; index -= 1) {
    if (candles[index].time <= atSec) {
      return candles[index].time
    }
  }

  return null
}
