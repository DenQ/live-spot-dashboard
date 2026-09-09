import { describe, expect, test } from 'vitest'

import type { Quote } from '@entities/quote'

import { overlaySparklineLast } from './use-sparklines'

function quote(instrumentId: string, last: number): Quote {
  return { instrumentId, last, changePct: 0, volume: 1, ts: 1 }
}

describe('overlaySparklineLast', () => {
  test('replaces only the forming close', () => {
    const snapshot = { BTCUSDT: [1, 2, 3] }
    const next = overlaySparklineLast(snapshot, { BTCUSDT: quote('BTCUSDT', 3.5) }, {})

    expect(next).toEqual({ BTCUSDT: [1, 2, 3.5] })
  })

  test('reuses previous series when the last price did not move', () => {
    const snapshot = { BTCUSDT: [1, 2, 3] }
    const prev = overlaySparklineLast(snapshot, { BTCUSDT: quote('BTCUSDT', 4) }, {})
    const again = overlaySparklineLast(snapshot, { BTCUSDT: quote('BTCUSDT', 4) }, prev)

    expect(again).toBe(prev)
    expect(again.BTCUSDT).toBe(prev.BTCUSDT)
  })

  test('keeps snapshot series when quotes are missing', () => {
    const snapshot = { BTCUSDT: [1, 2, 3] }
    const next = overlaySparklineLast(snapshot, {}, {})

    expect(next.BTCUSDT).toBe(snapshot.BTCUSDT)
  })
})
