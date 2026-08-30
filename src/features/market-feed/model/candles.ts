import type { Candle } from '@entities/candle'

function sameOhlcv(left: Candle, right: Candle): boolean {
  return (
    left.time === right.time &&
    left.open === right.open &&
    left.high === right.high &&
    left.low === right.low &&
    left.close === right.close &&
    left.volume === right.volume
  )
}

export function upsertCandle(list: Candle[], candle: Candle): Candle[] {
  const last = list.at(-1)

  if (last && last.time === candle.time) {
    return sameOhlcv(last, candle) ? list : [...list.slice(0, -1), candle]
  }

  if (last && candle.time < last.time) {
    return list
  }

  return [...list, candle]
}
