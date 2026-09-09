import type { Candle } from '@entities/candle'
import type { CoachAction, CoachAdvice, CoachCosts, CoachRegime, CoachRequest } from '@entities/coach'
import { COACH, type CoachConfig } from '@shared/config'

import { emaSeries, kaufmanER, lastFinite, median, smaLast, wilderAtrSeries } from './math'

function pickBars(request: CoachRequest): Candle[] {
  const hourly = request.series.find((item) => item.timeframe === '1h')
  return hourly?.bars ?? request.series[0]?.bars ?? []
}

export function minBarsNeeded(config: CoachConfig): number {
  return Math.max(config.erPeriod + 1, config.atrPeriod + config.atrMedianPeriod, config.emaSlow, config.smaPeriod)
}

export function roundTripCost(costs: CoachCosts): number {
  return 2 * (costs.takerFee + costs.slippageBpsMax / 10_000)
}

export function hasCostEdge(atr: number, price: number, costs: CoachCosts, minEdgeAtr: number): boolean {
  if (!(atr > 0) || !(price > 0)) {
    return false
  }

  return atr / price >= minEdgeAtr * roundTripCost(costs)
}

function formatEr(value: number): string {
  return value.toFixed(2)
}

function waitAdvice(
  regime: CoachRegime,
  reasons: string[],
  confidence: number,
  asOf: number,
): CoachAdvice {
  return {
    regime,
    action: 'wait',
    confidence,
    reasons: reasons.filter(Boolean).slice(0, 3),
    suggestedLimit: null,
    asOf,
  }
}

function detectRegime(
  bars: Candle[],
  closes: number[],
  config: CoachConfig,
): { regime: CoachRegime; er: number; atr: number; atrRatio: number } {
  const er = kaufmanER(closes, config.erPeriod)
  const atrSeries = wilderAtrSeries(bars, config.atrPeriod)
  const atr = lastFinite(atrSeries)
  const typical = median(atrSeries.filter(Number.isFinite).slice(-config.atrMedianPeriod))
  const atrRatio = typical > 0 && Number.isFinite(atr) ? atr / typical : 1

  if (Number.isFinite(atrRatio) && atrRatio >= config.spikeAtrMult) {
    return { regime: 'spike', er, atr, atrRatio }
  }

  const end = closes[closes.length - 1]
  const start = closes[closes.length - 1 - config.erPeriod]

  if (er >= config.erTrend) {
    return { regime: end >= start ? 'trend_up' : 'trend_down', er, atr, atrRatio }
  }

  return { regime: 'range', er, atr, atrRatio }
}

function lastBarAgainstTrend(bar: Candle, regime: 'trend_up' | 'trend_down', atr: number): boolean {
  const body = bar.close - bar.open
  if (regime === 'trend_up') {
    return body < -0.8 * atr
  }

  return body > 0.8 * atr
}

function trendSetup(
  bars: Candle[],
  closes: number[],
  regime: 'trend_up' | 'trend_down',
  atr: number,
  config: CoachConfig,
): { action: CoachAction; reason: string } {
  const close = closes[closes.length - 1]
  const emaFast = lastFinite(emaSeries(closes, config.emaFast))
  const emaSlow = lastFinite(emaSeries(closes, config.emaSlow))
  const bar = bars[bars.length - 1]

  if (!Number.isFinite(emaFast) || !Number.isFinite(emaSlow) || !(atr > 0)) {
    return { action: 'wait', reason: 'Not enough trend structure' }
  }

  if (lastBarAgainstTrend(bar, regime, atr)) {
    return { action: 'wait', reason: 'Last bar fights the trend' }
  }

  const band = config.pullbackAtr * atr
  const nearFast = Math.abs(close - emaFast) <= band

  if (regime === 'trend_up') {
    if (close < emaSlow) {
      return { action: 'wait', reason: 'Price lost the slow EMA' }
    }

    if (!nearFast) {
      return { action: 'wait', reason: `No pullback to EMA${config.emaFast} yet` }
    }

    return { action: 'buy', reason: `Pullback to EMA${config.emaFast}` }
  }

  if (close > emaSlow) {
    return { action: 'wait', reason: 'Price lost the slow EMA' }
  }

  if (!nearFast) {
    return { action: 'wait', reason: `No pullback to EMA${config.emaFast} yet` }
  }

  return { action: 'sell', reason: `Pullback to EMA${config.emaFast}` }
}

function rangeSetup(closes: number[], atr: number, config: CoachConfig): { action: CoachAction; reason: string } {
  const close = closes[closes.length - 1]
  const sma = smaLast(closes, config.smaPeriod)

  if (!Number.isFinite(sma) || !(atr > 0)) {
    return { action: 'wait', reason: 'Not enough range structure' }
  }

  const gap = close - sma
  const band = config.rangeBandAtr * atr

  if (gap > band) {
    return { action: 'sell', reason: `Stretched ${(gap / atr).toFixed(1)} ATR above SMA` }
  }

  if (gap < -band) {
    return { action: 'buy', reason: `Stretched ${(-gap / atr).toFixed(1)} ATR below SMA` }
  }

  return { action: 'wait', reason: 'Inside the range band' }
}

export function decideCoach(request: CoachRequest, config: CoachConfig = COACH): CoachAdvice {
  const bars = pickBars(request)
  const asOf = bars.at(-1)?.time ? bars[bars.length - 1].time * 1000 : 0
  const needed = minBarsNeeded(config)

  if (bars.length < needed) {
    return waitAdvice('range', [`Need ${needed} candles, have ${bars.length}`], 0, asOf)
  }

  if (!Number.isFinite(request.last) || request.last <= 0) {
    return waitAdvice('range', ['No live price'], 0, asOf)
  }

  const closes = bars.map((item) => item.close)
  const { regime, er, atr, atrRatio } = detectRegime(bars, closes, config)
  const reasons: string[] = []

  if (regime === 'spike') {
    reasons.push(`Volatility spike (${atrRatio.toFixed(1)}× typical ATR)`)
    reasons.push('Wait — not a setup')
    return waitAdvice('spike', reasons, 0.8, asOf)
  }

  if (regime === 'trend_up') {
    reasons.push(`1h trend up (ER ${formatEr(er)})`)
  } else if (regime === 'trend_down') {
    reasons.push(`1h trend down (ER ${formatEr(er)})`)
  } else {
    reasons.push(`Range (ER ${formatEr(er)})`)
  }

  const setup =
    regime === 'range'
      ? rangeSetup(closes, atr, config)
      : trendSetup(bars, closes, regime, atr, config)

  const edge = hasCostEdge(atr, request.last, request.costs, config.minEdgeAtr)
  const matched = [true, setup.action !== 'wait', edge].filter(Boolean).length
  const confidence = matched / 3

  if (setup.reason) {
    reasons.push(setup.reason)
  }

  if (!edge) {
    reasons.push('ATR too small vs fees')
    return waitAdvice(regime, reasons, confidence, asOf)
  }

  if (setup.action === 'wait') {
    return waitAdvice(regime, reasons, confidence, asOf)
  }

  reasons.push('Move covers paper costs')

  return {
    regime,
    action: setup.action,
    confidence,
    reasons: reasons.slice(0, 3),
    suggestedLimit: request.last,
    asOf,
  }
}
