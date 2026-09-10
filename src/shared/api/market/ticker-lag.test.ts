import { describe, expect, test } from 'vitest'

import { createTickerLagClock } from './ticker-lag'

describe('createTickerLagClock', () => {
  test('ignores a stable clock offset after the first sample', () => {
    const lag = createTickerLagClock()
    expect(lag(1_200, 1_000)).toBe(0)
    expect(lag(2_200, 2_000)).toBe(0)
    expect(lag(3_200, 3_000)).toBe(0)
  })

  test('reports extra delay on top of the offset', () => {
    const lag = createTickerLagClock(1)
    expect(lag(1_200, 1_000)).toBe(0)
    expect(lag(2_260, 2_000)).toBe(60)
  })

  test('drops stale or invalid stamps', () => {
    const lag = createTickerLagClock()
    expect(lag(Number.NaN, 1_000)).toBeNull()
    expect(lag(1_000, 1_000 + 30_000)).toBeNull()
  })
})
