import { describe, expect, test } from 'vitest'

import type { CoachAdvice } from '@entities/coach'

import { toRowHint } from './row-hint'

const advice = (action: CoachAdvice['action'], confidence = 0.67): CoachAdvice => ({
  regime: 'range',
  action,
  confidence,
  reasons: ['Range'],
  suggestedLimit: action === 'wait' ? null : 100,
  asOf: 1,
})

describe('toRowHint', () => {
  test('returns null without advice', () => {
    expect(toRowHint(null, true)).toBeNull()
    expect(toRowHint(undefined, false)).toBeNull()
  })

  test('keeps buy even without a position', () => {
    expect(toRowHint(advice('buy'), false)).toEqual({
      action: 'buy',
      confidence: 0.67,
      want: 0.67,
    })
  })

  test('hides sell when the pair is not in the portfolio', () => {
    expect(toRowHint(advice('sell', 0.8), false)).toEqual({
      action: 'wait',
      confidence: 0.8,
      want: null,
    })
  })

  test('keeps sell when the pair is held', () => {
    expect(toRowHint(advice('sell', 0.8), true)).toEqual({
      action: 'sell',
      confidence: 0.8,
      want: 0.8,
    })
  })

  test('wait has no want score', () => {
    expect(toRowHint(advice('wait'), true)?.want).toBeNull()
  })
})
