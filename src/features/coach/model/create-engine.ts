import { env } from '@shared/config'

import { createHttpCoachEngine } from './http-engine'
import { createLocalCoachEngine } from './local'
import type { CoachEngine } from './port'

export function createCoachEngine(): CoachEngine {
  const base = env.apiBaseUrl.trim()
  return base ? createHttpCoachEngine(base) : createLocalCoachEngine()
}
