import type { Quote } from '@entities/quote'

export function indexQuotes(quotes: Quote[]): Record<string, Quote> {
  return Object.fromEntries(quotes.map((quote) => [quote.instrumentId, quote]))
}

export function mergeQuote(map: Record<string, Quote>, incoming: Quote): Record<string, Quote> {
  const current = map[incoming.instrumentId]

  if (!current) {
    return { ...map, [incoming.instrumentId]: incoming }
  }

  const changePct = Number.isFinite(incoming.changePct) ? incoming.changePct : current.changePct
  const volume = incoming.volume > 0 ? incoming.volume : current.volume

  if (current.last === incoming.last && current.changePct === changePct && current.volume === volume) {
    return map
  }

  return {
    ...map,
    [incoming.instrumentId]: {
      ...current,
      last: incoming.last,
      changePct,
      ts: incoming.ts,
      volume,
    },
  }
}
