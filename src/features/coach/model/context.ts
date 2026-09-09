import { createContext } from 'react'

import type { CoachAdvice } from '@entities/coach'

export type CoachContextValue = {
  hintsEnabled: boolean
  setHintsEnabled: (enabled: boolean) => void
  advice: CoachAdvice | null
  adviceById: Record<string, CoachAdvice>
  error: string | null
}

export const CoachContext = createContext<CoachContextValue | null>(null)
