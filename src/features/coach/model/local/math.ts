import type { Candle } from '@entities/candle'

export function kaufmanER(closes: number[], period: number): number {
  if (period <= 0 || closes.length < period + 1) {
    return 0
  }

  const end = closes.length - 1
  const start = end - period
  const net = Math.abs(closes[end] - closes[start])
  let path = 0

  for (let index = start + 1; index <= end; index += 1) {
    path += Math.abs(closes[index] - closes[index - 1])
  }

  if (path === 0) {
    return 0
  }

  return net / path
}

export function trueRanges(bars: Candle[]): number[] {
  return bars.map((bar, index) => {
    const range = bar.high - bar.low
    if (index === 0) {
      return Math.max(0, range)
    }

    const prevClose = bars[index - 1].close
    return Math.max(range, Math.abs(bar.high - prevClose), Math.abs(bar.low - prevClose))
  })
}

export function wilderAtrSeries(bars: Candle[], period: number): number[] {
  const ranges = trueRanges(bars)
  const series = Array.from({ length: ranges.length }, () => Number.NaN)

  if (period <= 0 || ranges.length < period) {
    return series
  }

  let sum = 0
  for (let index = 0; index < period; index += 1) {
    sum += ranges[index]
  }

  series[period - 1] = sum / period

  for (let index = period; index < ranges.length; index += 1) {
    series[index] = (series[index - 1] * (period - 1) + ranges[index]) / period
  }

  return series
}

export function median(values: number[]): number {
  const ranked = values.filter((value) => Number.isFinite(value)).sort((left, right) => left - right)

  if (ranked.length === 0) {
    return 0
  }

  const mid = Math.floor(ranked.length / 2)
  return ranked.length % 2 === 1 ? ranked[mid] : (ranked[mid - 1] + ranked[mid]) / 2
}

export function emaSeries(values: number[], period: number): number[] {
  const series = Array.from({ length: values.length }, () => Number.NaN)

  if (period <= 0 || values.length < period) {
    return series
  }

  let sum = 0
  for (let index = 0; index < period; index += 1) {
    sum += values[index]
  }

  let ema = sum / period
  series[period - 1] = ema
  const alpha = 2 / (period + 1)

  for (let index = period; index < values.length; index += 1) {
    ema = alpha * values[index] + (1 - alpha) * ema
    series[index] = ema
  }

  return series
}

export function smaLast(values: number[], period: number): number {
  if (period <= 0 || values.length < period) {
    return Number.NaN
  }

  let sum = 0
  for (let index = values.length - period; index < values.length; index += 1) {
    sum += values[index]
  }

  return sum / period
}

export function lastFinite(values: number[]): number {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (Number.isFinite(values[index])) {
      return values[index]
    }
  }

  return Number.NaN
}
