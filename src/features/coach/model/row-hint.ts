import type { CoachAction, CoachAdvice } from '@entities/coach'

export const COACH_ACTION_LABEL: Record<CoachAction, string> = {
  buy: 'Buy',
  sell: 'Sell',
  wait: 'Wait',
}

export type CoachRowHint = {
  action: CoachAction
  confidence: number
  want: number | null
}

export function toRowHint(advice: CoachAdvice | null | undefined, hasPosition: boolean): CoachRowHint | null {
  if (!advice) {
    return null
  }

  const action = advice.action === 'sell' && !hasPosition ? 'wait' : advice.action
  const want = action === 'wait' ? null : advice.confidence

  return {
    action,
    confidence: advice.confidence,
    want,
  }
}
