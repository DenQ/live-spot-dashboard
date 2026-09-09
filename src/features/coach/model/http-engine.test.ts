import { afterEach, describe, expect, test, vi } from 'vitest'

import { createHttpCoachEngine } from './http-engine'

const sample = {
  regime: 'trend_up',
  action: 'buy',
  confidence: 1,
  reasons: ['1h trend up'],
  suggestedLimit: 101,
  asOf: 1_700_000_000_000,
}

describe('http coach engine', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('posts the request and parses advice', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => sample,
      })),
    )

    const engine = createHttpCoachEngine('https://coach.example')
    const advice = await engine.decide({
      instrumentId: 'BTCUSDT',
      last: 101,
      positionQty: 0,
      series: [],
      costs: { takerFee: 0.001, slippageBpsMax: 12, fillChance: 0.9 },
    })

    expect(advice.action).toBe('buy')
    expect(fetch).toHaveBeenCalledWith(
      'https://coach.example/coach/advice',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  test('rejects an invalid payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ hello: 'nope' }),
      })),
    )

    const engine = createHttpCoachEngine('https://coach.example/')
    await expect(
      engine.decide({
        instrumentId: 'BTCUSDT',
        last: 1,
        positionQty: 0,
        series: [],
        costs: { takerFee: 0.001, slippageBpsMax: 12, fillChance: 0.9 },
      }),
    ).rejects.toThrow('invalid payload')
  })
})
