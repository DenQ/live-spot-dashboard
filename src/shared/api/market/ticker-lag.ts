const MAX_SKEW_MS = 30_000

export function createTickerLagClock(alpha = 0.15) {
  let offset = 0
  let primed = false

  return function tickerLagMs(eventTime: number, now: number): number | null {
    if (!Number.isFinite(eventTime) || !Number.isFinite(now)) {
      return null
    }

    const skew = eventTime - now
    if (Math.abs(skew) >= MAX_SKEW_MS) {
      return null
    }

    if (!primed) {
      offset = skew
      primed = true
      return 0
    }

    const lag = Math.round(Math.abs(skew - offset))
    offset += (skew - offset) * alpha
    return lag
  }
}
