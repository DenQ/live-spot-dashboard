import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { setDocumentTheme, type ColorScheme } from '@shared/lib'

import { ThemeContext } from './context'
import { persistTheme, readTheme } from './storage'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ColorScheme>(readTheme)

  const setTheme = useCallback((next: ColorScheme) => {
    setThemeState(next)
    persistTheme(next)
    setDocumentTheme(next)
  }, [])

  useEffect(() => {
    setDocumentTheme(theme)
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme }), [setTheme, theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
