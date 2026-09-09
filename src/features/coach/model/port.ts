import type { CoachAdvice, CoachRequest } from '@entities/coach'

export type CoachEngine = {
  decide: (request: CoachRequest) => Promise<CoachAdvice>
}
