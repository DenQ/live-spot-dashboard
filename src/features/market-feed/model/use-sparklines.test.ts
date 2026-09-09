import { describe, expect, test } from 'vitest'

import type { Quote } from '@entities/quote'

import { overlaySparklineLast, sparkClosesById, type SparkBar } from './use-sparklines'

function quote(instrumentId: string, last: number): Quote {
  return { instrumentId, last, changePct: 0, volume: 1, ts: 1 }
}

function bars(...closes: number[]): SparkBar[] {
  return closes.map((close, index) => ({ time: 1_700_000_000 + index * 3600, close }))
}

describe('overlaySparklineLast', () => {
  test('replaces only the forming close', () => {
    const snapshot = { BTCUSDT: bars(1, 2, 3) }
    const next = overlaySparklineLast(snapshot, { BTCUSDT: quote('BTCUSDT', 3.5) }, {})

    expect(next.BTCUSDT.map((bar) => bar.close)).toEqual([1, 2, 3.5])
    expect(next.BTCUSDT[2].time).toBe(snapshot.BTCUSDT[2].time)
  })

  test('reuses previous series when the last price did not move', () => {
    const snapshot = { BTCUSDT: bars(1, 2, 3) }
    const prev = overlaySparklineLast(snapshot, { BTCUSDT: quote('BTCUSDT', 4) }, {})
    const again = overlaySparklineLast(snapshot, { BTCUSDT: quote('BTCUSDT', 4) }, prev)

    expect(again).toBe(prev)
    expect(again.BTCUSDT).toBe(prev.BTCUSDT)
  })

  test('keeps snapshot series when quotes are missing', () => {
    const snapshot = { BTCUSDT: bars(1, 2, 3) }
    const next = overlaySparklineLast(snapshot, {}, {})

    expect(next.BTCUSDT).toBe(snapshot.BTCUSDT)
  })
})

describe('sparkClosesById', () => {
  test('maps bars to close arrays', () => {
    expect(sparkClosesById({ BTCUSDT: bars(1, 2, 3) })).toEqual({ BTCUSDT: [1, 2, 3] })
  })
})
