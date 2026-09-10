import { useSyncExternalStore } from 'react'

export type ColorScheme = 'dark' | 'light'

const THEME_EVENT = 'markets-theme'

export function getDocumentTheme(): ColorScheme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function setDocumentTheme(theme: ColorScheme) {
  document.documentElement.dataset.theme = theme
  window.dispatchEvent(new Event(THEME_EVENT))
}

export function subscribeDocumentTheme(onStoreChange: () => void) {
  window.addEventListener(THEME_EVENT, onStoreChange)
  return () => window.removeEventListener(THEME_EVENT, onStoreChange)
}

export function useDocumentTheme(): ColorScheme {
  return useSyncExternalStore(subscribeDocumentTheme, getDocumentTheme, () => 'dark')
}
