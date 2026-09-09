import type { CoachRequest } from '@entities/coach'
import { requestJson } from '@shared/api'

import type { CoachEngine } from './port'
import { parseCoachAdvice } from './parse'

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

export function createHttpCoachEngine(baseUrl: string): CoachEngine {
  const root = baseUrl.replace(/\/$/, '')

  return {
    async decide(request: CoachRequest) {
      const payload = await requestJson<unknown>(joinUrl(root, '/coach/advice'), {
        method: 'POST',
        body: request,
      })
      const advice = parseCoachAdvice(payload)

      if (!advice) {
        throw new Error('Coach returned an invalid payload')
      }

      return advice
    },
  }
}
