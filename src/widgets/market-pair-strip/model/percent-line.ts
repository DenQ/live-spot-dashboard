import type { SparkBar } from '@features/market-feed'
import type { UTCTimestamp } from 'lightweight-charts'

export function toPercentLine(bars: SparkBar[]) {
  const origin = bars[0]?.close

  if (!origin || !Number.isFinite(origin) || origin === 0) {
    return []
  }

  return bars.map((bar) => ({
    time: bar.time as UTCTimestamp,
    value: ((bar.close / origin) - 1) * 100,
  }))
}

export function lastPercent(bars: SparkBar[]) {
  const line = toPercentLine(bars)
  return line.at(-1)?.value
}
