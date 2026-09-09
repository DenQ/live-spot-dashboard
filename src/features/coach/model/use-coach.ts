import { useContext } from 'react'

import { CoachContext } from './context'

export function useCoach() {
  const value = useContext(CoachContext)

  if (!value) {
    throw new Error('useCoach must be used inside CoachProvider')
  }

  return value
}
