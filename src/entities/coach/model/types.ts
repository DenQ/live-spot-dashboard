import type { Candle } from '@entities/candle'

export const COACH_TIMEFRAMES = ['1h', '1m', '5m'] as const
export type CoachTimeframe = (typeof COACH_TIMEFRAMES)[number]

export const COACH_REGIMES = ['trend_up', 'trend_down', 'range', 'spike'] as const
export type CoachRegime = (typeof COACH_REGIMES)[number]

export const COACH_ACTIONS = ['buy', 'sell', 'wait'] as const
export type CoachAction = (typeof COACH_ACTIONS)[number]

export type CoachSeries = {
  timeframe: CoachTimeframe
  bars: Candle[]
}

export type CoachCosts = {
  takerFee: number
  slippageBpsMax: number
  fillChance: number
}

export type CoachRequest = {
  instrumentId: string
  last: number
  positionQty: number
  series: CoachSeries[]
  costs: CoachCosts
}

export type CoachAdvice = {
  regime: CoachRegime
  action: CoachAction
  confidence: number
  reasons: string[]
  suggestedLimit: number | null
  asOf: number
}
