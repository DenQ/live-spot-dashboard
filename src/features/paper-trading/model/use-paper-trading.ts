import { useContext } from 'react'

import { PaperTradingContext } from './context'

export function usePaperTrading() {
  const value = useContext(PaperTradingContext)

  if (!value) {
    throw new Error('usePaperTrading must be used inside PaperTradingProvider')
  }

  return value
}
