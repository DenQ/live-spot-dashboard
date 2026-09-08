import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { APP_STORAGE_KEYS } from '@shared/config'

import {
  parseChartViewport,
  persistChartViewport,
  readChartViewport,
  resetChartViewportCache,
} from './storage'

function stubLocalStorage() {
  const store = new Map<string, string>()

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  })

  return store
}

describe('chart viewport storage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    stubLocalStorage()
    resetChartViewportCache()
  })

  afterEach(() => {
    resetChartViewportCache()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  test('parseChartViewport accepts a finite range', () => {
    expect(parseChartViewport({ from: 120, to: 167 })).toEqual({ from: 120, to: 167 })
  })

  test('parseChartViewport rejects invalid payloads', () => {
    expect(parseChartViewport(null)).toBeNull()
    expect(parseChartViewport('{"from":1,"to":2}')).toBeNull()
    expect(parseChartViewport({ from: 10, to: 10 })).toBeNull()
    expect(parseChartViewport({ from: 12, to: 5 })).toBeNull()
    expect(parseChartViewport({ from: Number.NaN, to: 8 })).toBeNull()
    expect(parseChartViewport({ from: 1, to: Number.POSITIVE_INFINITY })).toBeNull()
    expect(parseChartViewport({ from: '1', to: 2 })).toBeNull()
  })

  test('readChartViewport returns null for invalid JSON', () => {
    localStorage.setItem(APP_STORAGE_KEYS.chartViewport, '{not json')
    expect(readChartViewport()).toBeNull()
  })

  test('readChartViewport returns null for a stored invalid range', () => {
    localStorage.setItem(APP_STORAGE_KEYS.chartViewport, JSON.stringify({ from: 5, to: 5 }))
    expect(readChartViewport()).toBeNull()
  })

  test('persistChartViewport writes one shared key after debounce', () => {
    persistChartViewport({ from: 80, to: 140 })
    expect(localStorage.getItem(APP_STORAGE_KEYS.chartViewport)).toBeNull()
    expect(readChartViewport()).toEqual({ from: 80, to: 140 })

    vi.advanceTimersByTime(200)

    expect(localStorage.getItem(APP_STORAGE_KEYS.chartViewport)).toBe(
      JSON.stringify({ from: 80, to: 140 }),
    )
    expect(APP_STORAGE_KEYS.chartViewport).toBe('markets.chart.viewport')
  })

  test('persistChartViewport ignores invalid ranges', () => {
    persistChartViewport({ from: 10, to: 1 })
    vi.advanceTimersByTime(200)
    expect(localStorage.getItem(APP_STORAGE_KEYS.chartViewport)).toBeNull()
    expect(readChartViewport()).toBeNull()
  })
})
