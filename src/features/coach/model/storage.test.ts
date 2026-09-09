import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { APP_STORAGE_KEYS } from '@shared/config'

import { persistHintsEnabled, readHintsEnabled } from './storage'

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

describe('coach hints storage', () => {
  beforeEach(() => {
    stubLocalStorage()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('defaults to off', () => {
    expect(readHintsEnabled()).toBe(false)
  })

  test('persists on and off', () => {
    persistHintsEnabled(true)
    expect(localStorage.getItem(APP_STORAGE_KEYS.coachHints)).toBe('1')
    expect(readHintsEnabled()).toBe(true)

    persistHintsEnabled(false)
    expect(readHintsEnabled()).toBe(false)
  })
})
