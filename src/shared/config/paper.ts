export const PAPER = {
  startingCash: 1_000,
  takerFee: 0.001,
  matchDelayMs: { min: 800, max: 3_500 },
  workingTtlMs: 45_000,
  fillChance: 0.9,
  slippageBps: { max: 12 },
  ledgerLimit: 100,
  closedOrderLimit: 80,
} as const
