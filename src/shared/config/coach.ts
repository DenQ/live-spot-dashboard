export const COACH = {
  erPeriod: 20,
  erTrend: 0.42,
  atrPeriod: 14,
  atrMedianPeriod: 20,
  spikeAtrMult: 2.2,
  emaFast: 9,
  emaSlow: 21,
  smaPeriod: 21,
  pullbackAtr: 0.35,
  rangeBandAtr: 1.2,
  minEdgeAtr: 1.5,
} as const

export type CoachConfig = {
  [K in keyof typeof COACH]: number
}
