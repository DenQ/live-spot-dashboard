import {
  COACH_ACTIONS,
  COACH_REGIMES,
  type CoachAdvice,
} from '@entities/coach'
import { isRecord } from '@shared/lib'

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.includes(value as T)
}

export function parseCoachAdvice(value: unknown): CoachAdvice | null {
  if (!isRecord(value)) {
    return null
  }

  if (!isMember(value.regime, COACH_REGIMES) || !isMember(value.action, COACH_ACTIONS)) {
    return null
  }

  if (typeof value.confidence !== 'number' || !Number.isFinite(value.confidence)) {
    return null
  }

  if (!Array.isArray(value.reasons) || !value.reasons.every((item) => typeof item === 'string')) {
    return null
  }

  const suggestedLimit = value.suggestedLimit
  if (suggestedLimit !== null && (typeof suggestedLimit !== 'number' || !Number.isFinite(suggestedLimit))) {
    return null
  }

  if (typeof value.asOf !== 'number' || !Number.isFinite(value.asOf)) {
    return null
  }

  return {
    regime: value.regime,
    action: value.action,
    confidence: Math.min(1, Math.max(0, value.confidence)),
    reasons: value.reasons.filter((item) => item.length > 0).slice(0, 3),
    suggestedLimit,
    asOf: value.asOf,
  }
}
