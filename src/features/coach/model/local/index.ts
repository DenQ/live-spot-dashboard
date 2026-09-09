import { COACH, type CoachConfig } from '@shared/config'

import type { CoachEngine } from '../port'
import { decideCoach } from './decide'

export function createLocalCoachEngine(config: CoachConfig = COACH): CoachEngine {
  return {
    async decide(request) {
      return decideCoach(request, config)
    },
  }
}

export { decideCoach } from './decide'
