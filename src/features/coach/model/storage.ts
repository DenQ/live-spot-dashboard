import { APP_STORAGE_KEYS } from '@shared/config'

export function readHintsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEYS.coachHints)
    return raw === '1' || raw === 'true'
  } catch {
    return false
  }
}

export function persistHintsEnabled(enabled: boolean) {
  try {
    localStorage.setItem(APP_STORAGE_KEYS.coachHints, enabled ? '1' : '0')
  } catch {
    // ignore quota / private mode
  }
}
