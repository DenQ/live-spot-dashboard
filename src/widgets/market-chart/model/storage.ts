import { APP_STORAGE_KEYS } from '@shared/config'
import { isRecord } from '@shared/lib'

const PERSIST_DEBOUNCE_MS = 200

export type ChartViewport = {
  from: number
  to: number
}

let memory: ChartViewport | null | undefined
let persistTimer: ReturnType<typeof setTimeout> | null = null

export function parseChartViewport(value: unknown): ChartViewport | null {
  if (!isRecord(value)) {
    return null
  }

  const { from, to } = value
  if (typeof from !== 'number' || typeof to !== 'number') {
    return null
  }

  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    return null
  }

  return { from, to }
}

export function readChartViewport(): ChartViewport | null {
  if (memory !== undefined) {
    return memory
  }

  try {
    const raw = localStorage.getItem(APP_STORAGE_KEYS.chartViewport)
    if (!raw) {
      memory = null
      return null
    }

    memory = parseChartViewport(JSON.parse(raw) as unknown)
    return memory
  } catch {
    memory = null
    return null
  }
}

export function persistChartViewport(range: ChartViewport) {
  const parsed = parseChartViewport(range)
  if (!parsed) {
    return
  }

  memory = parsed

  if (persistTimer !== null) {
    clearTimeout(persistTimer)
  }

  persistTimer = setTimeout(() => {
    persistTimer = null
    try {
      localStorage.setItem(APP_STORAGE_KEYS.chartViewport, JSON.stringify(memory))
    } catch {
      // ignore
    }
  }, PERSIST_DEBOUNCE_MS)
}

export function resetChartViewportCache() {
  memory = undefined
  if (persistTimer !== null) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
}
