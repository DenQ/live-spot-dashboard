/** Binance has no app-level ping; we treat the socket as dead if no frames arrive. */
export const BINANCE_WS_IDLE = {
  /** miniTicker for the watchlist updates every few seconds on active pairs. */
  quotesMs: 45_000,
  /** Hourly kline can go quiet on illiquid pairs; allow a longer silence window. */
  candlesMs: 120_000,
} as const

/** Bybit supports ping/pong plus a data-idle fallback. */
export const BYBIT_WS = {
  /** Close if no frames at all (quotes or pongs) for this long. */
  idleMs: 60_000,
  /** How often we send { op: 'ping' } to measure RTT and keep the session alive. */
  heartbeatIntervalMs: 15_000,
  /** Close if no pong arrives within this window after a ping. */
  pongTimeoutMs: 10_000,
} as const
