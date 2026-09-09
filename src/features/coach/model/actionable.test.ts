import { describe, expect, test } from 'vitest'

import type { CoachAdvice } from '@entities/coach'

import { actionableKeys, hasNewActionable, shouldPlayOffscreenHint } from './actionable'

const advice = (action: CoachAdvice['action']): CoachAdvice => ({
  regime: 'range',
  action,
  confidence: 0.7,
  reasons: ['Range'],
  suggestedLimit: action === 'wait' ? null : 100,
  asOf: 1,
})

describe('actionableKeys', () => {
  test('keeps buy and held sell, drops wait and naked sell', () => {
    expect(
      actionableKeys(
        {
          BTCUSDT: advice('buy'),
          ETHUSDT: advice('sell'),
          SOLUSDT: advice('wait'),
          BNBUSDT: advice('sell'),
        },
        { BTCUSDT: 0, ETHUSDT: 0.4, SOLUSDT: 1, BNBUSDT: 0 },
      ),
    ).toEqual(['BTCUSDT:buy', 'ETHUSDT:sell'])
  })
})

describe('hasNewActionable', () => {
  test('is false when nothing new appears', () => {
    expect(hasNewActionable(['BTCUSDT:buy'], ['BTCUSDT:buy'])).toBe(false)
    expect(hasNewActionable(['BTCUSDT:buy'], [])).toBe(false)
  })

  test('is true when a fresh buy or sell shows up', () => {
    expect(hasNewActionable([], ['BTCUSDT:buy'])).toBe(true)
    expect(hasNewActionable(['BTCUSDT:buy'], ['BTCUSDT:buy', 'ETHUSDT:sell'])).toBe(true)
  })
})

describe('shouldPlayOffscreenHint', () => {
  test('plays only when hints are on, the tab is hidden, and a new action appears', () => {
    expect(
      shouldPlayOffscreenHint({
        hintsEnabled: true,
        hidden: true,
        previousKeys: [],
        currentKeys: ['BTCUSDT:buy'],
      }),
    ).toBe(true)
    expect(
      shouldPlayOffscreenHint({
        hintsEnabled: true,
        hidden: false,
        previousKeys: [],
        currentKeys: ['BTCUSDT:buy'],
      }),
    ).toBe(false)
    expect(
      shouldPlayOffscreenHint({
        hintsEnabled: false,
        hidden: true,
        previousKeys: [],
        currentKeys: ['BTCUSDT:buy'],
      }),
    ).toBe(false)
  })
})
