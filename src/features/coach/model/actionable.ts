import type { CoachAdvice } from '@entities/coach'

import { toRowHint } from './row-hint'

export function actionableKeys(
  adviceById: Record<string, CoachAdvice>,
  qtyById: Record<string, number>,
): string[] {
  const keys: string[] = []

  for (const [instrumentId, advice] of Object.entries(adviceById)) {
    const hint = toRowHint(advice, (qtyById[instrumentId] ?? 0) > 0)
    if (hint?.action === 'buy' || hint?.action === 'sell') {
      keys.push(`${instrumentId}:${hint.action}`)
    }
  }

  return keys.sort()
}

export function hasNewActionable(previous: readonly string[], current: readonly string[]): boolean {
  if (current.length === 0) {
    return false
  }

  const seen = new Set(previous)
  return current.some((key) => !seen.has(key))
}

export function shouldPlayOffscreenHint(input: {
  hintsEnabled: boolean
  hidden: boolean
  previousKeys: readonly string[]
  currentKeys: readonly string[]
}): boolean {
  return input.hintsEnabled && input.hidden && hasNewActionable(input.previousKeys, input.currentKeys)
}
