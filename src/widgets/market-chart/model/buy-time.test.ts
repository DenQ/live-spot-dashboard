import { describe, expect, test } from 'vitest'

import type { Candle } from '@entities/candle'

import { snapFillToCandleTime } from './buy-time'

function candles(...times: number[]): Candle[] {
  return times.map((time) => ({
    instrumentId: 'BTCUSDT',
    time,
    open: 1,
    high: 1,
    low: 1,
    close: 1,
    volume: 1,
  }))
}

describe('snapFillToCandleTime', () => {
  test('returns null without candles or a finite time', () => {
    expect(snapFillToCandleTime([], 1_700_000_000_000)).toBeNull()
    expect(snapFillToCandleTime(candles(1_700_003_600), Number.NaN)).toBeNull()
  })

  test('returns null when the fill is before the first candle', () => {
    expect(snapFillToCandleTime(candles(1_700_003_600, 1_700_007_200), 1_700_000_000_000)).toBeNull()
  })

  test('snaps a fill to the hourly candle that contains it', () => {
    const series = candles(1_700_000_000, 1_700_003_600, 1_700_007_200)

    expect(snapFillToCandleTime(series, 1_700_000_000_000)).toBe(1_700_000_000)
    expect(snapFillToCandleTime(series, 1_700_003_599_000)).toBe(1_700_000_000)
    expect(snapFillToCandleTime(series, 1_700_003_600_500)).toBe(1_700_003_600)
  })

  test('snaps a fill after the last open onto the forming candle', () => {
    expect(snapFillToCandleTime(candles(1_700_000_000, 1_700_003_600), 1_700_010_000_000)).toBe(1_700_003_600)
  })
})
