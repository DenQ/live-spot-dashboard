import type { Quote } from './types'

export function lastPrices(map: Record<string, Quote>): Record<string, number> {
  const next: Record<string, number> = {}

  for (const [id, quote] of Object.entries(map)) {
    if (Number.isFinite(quote.last)) {
      next[id] = quote.last
    }
  }

  return next
}
