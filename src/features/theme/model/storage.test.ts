import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { APP_STORAGE_KEYS } from '@shared/config'

import { persistTheme, readTheme } from './storage'

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

describe('theme storage', () => {
  beforeEach(() => {
    stubLocalStorage()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('defaults to dark', () => {
    expect(readTheme()).toBe('dark')
  })

  test('reads light', () => {
    localStorage.setItem(APP_STORAGE_KEYS.theme, 'light')
    expect(readTheme()).toBe('light')
  })

  test('treats garbage as dark', () => {
    localStorage.setItem(APP_STORAGE_KEYS.theme, 'dim')
    expect(readTheme()).toBe('dark')
  })

  test('persists dark and light', () => {
    persistTheme('light')
    expect(localStorage.getItem(APP_STORAGE_KEYS.theme)).toBe('light')
    expect(readTheme()).toBe('light')

    persistTheme('dark')
    expect(readTheme()).toBe('dark')
  })
})
