import { describe, expect, test } from 'vitest'

import type { Candle } from '@entities/candle'
import type { CoachCosts, CoachRequest } from '@entities/coach'
import { COACH, type CoachConfig } from '@shared/config'

import { decideCoach, hasCostEdge, minBarsNeeded, roundTripCost } from './decide'
import { kaufmanER } from './math'

const costs: CoachCosts = {
  takerFee: 0.001,
  slippageBpsMax: 12,
  fillChance: 0.9,
}

function fromCloses(closes: number[], spread: number): Candle[] {
  return closes.map((close, index) => {
    const open = index === 0 ? close : closes[index - 1]
    const high = Math.max(open, close) + spread / 2
    const low = Math.min(open, close) - spread / 2

    return {
      instrumentId: 'BTCUSDT',
      time: 1_700_000_000 + index * 3600,
      open,
      high,
      low,
      close,
      volume: 12,
    }
  })
}

function request(bars: Candle[], last?: number): CoachRequest {
  return {
    instrumentId: 'BTCUSDT',
    last: last ?? bars[bars.length - 1].close,
    positionQty: 0,
    series: [{ timeframe: '1h', bars }],
    costs,
  }
}

function rising(count: number, start: number, step: number, spread: number): Candle[] {
  const closes = Array.from({ length: count }, (_, index) => start + index * step)
  return fromCloses(closes, spread)
}

describe('local coach math', () => {
  test('kaufman ER is 1 on a straight line', () => {
    expect(kaufmanER([1, 2, 3, 4, 5], 4)).toBe(1)
  })

  test('kaufman ER is ~0 on a round trip', () => {
    expect(kaufmanER([1, 2, 1, 2, 1], 4)).toBeCloseTo(0, 8)
  })

  test('round-trip cost matches paper fees and slippage', () => {
    expect(roundTripCost(costs)).toBeCloseTo(2 * (0.001 + 0.0012), 10)
  })

  test('cost gate rejects a thin ATR', () => {
    expect(hasCostEdge(0.05, 100, costs, COACH.minEdgeAtr)).toBe(false)
  })

  test('cost gate accepts a wide ATR', () => {
    expect(hasCostEdge(1.2, 100, costs, COACH.minEdgeAtr)).toBe(true)
  })
})

describe('decideCoach', () => {
  test('asks to wait when history is short', () => {
    const bars = rising(8, 100, 1, 1)
    const advice = decideCoach(request(bars))

    expect(advice.action).toBe('wait')
    expect(advice.confidence).toBe(0)
    expect(advice.reasons[0]).toContain(`Need ${minBarsNeeded(COACH)}`)
  })

  test('labels a steady climb as trend_up and never sells it', () => {
    const bars = rising(80, 100, 0.9, 1.1)
    const advice = decideCoach(request(bars))

    expect(advice.regime).toBe('trend_up')
    expect(advice.action).not.toBe('sell')
  })

  test('buys an uptrend when pullback and edge filters are loose', () => {
    const bars = rising(80, 100, 0.9, 1.4)
    const loose: CoachConfig = { ...COACH, pullbackAtr: 80, minEdgeAtr: 0.2 }
    const advice = decideCoach(request(bars), loose)

    expect(advice.regime).toBe('trend_up')
    expect(advice.action).toBe('buy')
    expect(advice.suggestedLimit).toBe(bars[bars.length - 1].close)
    expect(advice.confidence).toBeGreaterThan(0.5)
  })

  test('labels a sine chop as range', () => {
    const closes = Array.from({ length: 80 }, (_, index) => 100 + 4 * Math.sin((index / 8) * Math.PI))
    const advice = decideCoach(request(fromCloses(closes, 0.4)))

    expect(advice.regime).toBe('range')
    expect(advice.action).not.toBeUndefined()
  })

  test('waits through an ATR spike', () => {
    const quiet = rising(50, 100, 0, 0.4)
    const spike = fromCloses(
      [100, 108, 92, 110],
      18,
    ).map((bar, index) => ({
      ...bar,
      time: quiet[quiet.length - 1].time + (index + 1) * 3600,
    }))
    const bars = [...quiet.slice(0, -1), ...spike]
    const advice = decideCoach(request(bars))

    expect(advice.regime).toBe('spike')
    expect(advice.action).toBe('wait')
    expect(advice.suggestedLimit).toBeNull()
  })

  test('cost gate blocks a thin-range trend', () => {
    const bars = rising(80, 100, 0.02, 0.03)
    const loose: CoachConfig = { ...COACH, pullbackAtr: 80, minEdgeAtr: 1.5 }
    const advice = decideCoach(request(bars), loose)

    expect(advice.action).toBe('wait')
    expect(advice.reasons.some((item) => item.includes('fees'))).toBe(true)
  })
})
