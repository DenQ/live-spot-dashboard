import type { Candle } from '@entities/candle'
import type { CoachRequest } from '@entities/coach'
import { PAPER } from '@shared/config'

export function buildCoachRequest(input: {
  instrumentId: string
  last: number
  positionQty: number
  candles: Candle[]
}): CoachRequest {
  return {
    instrumentId: input.instrumentId,
    last: input.last,
    positionQty: input.positionQty,
    series: [{ timeframe: '1h', bars: input.candles }],
    costs: {
      takerFee: PAPER.takerFee,
      slippageBpsMax: PAPER.slippageBps.max,
      fillChance: PAPER.fillChance,
    },
  }
}
