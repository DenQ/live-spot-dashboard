import { createContext } from 'react'

import type { ColorScheme } from '@shared/lib'

export type ThemeContextValue = {
  theme: ColorScheme
  setTheme: (theme: ColorScheme) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
