import type { Candle } from '@entities/candle'

export function upsertCandle(list: Candle[], candle: Candle): Candle[] {
  const last = list.at(-1)

  if (last && last.time === candle.time) {
    return [...list.slice(0, -1), candle]
  }

  if (last && candle.time < last.time) {
    return list
  }

  return [...list, candle]
}
