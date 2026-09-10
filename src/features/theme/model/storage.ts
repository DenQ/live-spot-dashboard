import { APP_STORAGE_KEYS } from '@shared/config'
import { setDocumentTheme, type ColorScheme } from '@shared/lib'

export function readTheme(): ColorScheme {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEYS.theme)
    return raw === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function persistTheme(theme: ColorScheme) {
  try {
    localStorage.setItem(APP_STORAGE_KEYS.theme, theme)
  } catch {
    // ignore quota / private mode
  }
}

export function applyStoredTheme() {
  setDocumentTheme(readTheme())
}
