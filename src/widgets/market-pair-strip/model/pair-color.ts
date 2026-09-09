const PAIR_COLORS: Record<string, string> = {
  BTCUSDT: '#3df0ff',
  ETHUSDT: '#ff2ee6',
  SOLUSDT: '#ffe14d',
  BNBUSDT: '#7cffb2',
  XRPUSDT: '#7aa2ff',
  DOGEUSDT: '#ff9f43',
}

const FALLBACK = '#b197c4'

export function pairColor(instrumentId: string) {
  return PAIR_COLORS[instrumentId] ?? FALLBACK
}
