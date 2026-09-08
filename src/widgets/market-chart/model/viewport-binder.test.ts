import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type { IChartApi, LogicalRange } from 'lightweight-charts'

import { persistChartViewport, readChartViewport, resetChartViewportCache } from './storage'
import { bindChartViewport } from './viewport-binder'

function stubLocalStorage() {
  const store = new Map<string, string>()

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  })
}

function createFrameQueue() {
  const queue: FrameRequestCallback[] = []

  return {
    schedule: (callback: FrameRequestCallback) => {
      queue.push(callback)
      return queue.length
    },
    flush: () => {
      const batch = queue.splice(0)
      for (const callback of batch) {
        callback(0)
      }
    },
  }
}

function createBinder() {
  const frames = createFrameQueue()
  const host = document.createElement('div')
  const rangeHandlers: Array<(range: LogicalRange | null) => void> = []
  const setVisibleLogicalRange = vi.fn()
  const fitContent = vi.fn()

  const timeScale = {
    subscribeVisibleLogicalRangeChange: (handler: (range: LogicalRange | null) => void) => {
      rangeHandlers.push(handler)
    },
    unsubscribeVisibleLogicalRangeChange: vi.fn(),
    getVisibleLogicalRange: vi.fn(() => ({ from: 0, to: 23 })),
    setVisibleLogicalRange,
    fitContent,
  }

  const chart = {
    timeScale: () => timeScale,
  } as unknown as IChartApi

  const binder = bindChartViewport(chart, host, frames.schedule)

  return {
    binder,
    host,
    frames,
    rangeHandlers,
    setVisibleLogicalRange,
    fitContent,
    emitRange: (range: LogicalRange | null) => {
      for (const handler of rangeHandlers) {
        handler(range)
      }
    },
  }
}

describe('chart viewport binder', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    stubLocalStorage()
    resetChartViewportCache()
  })

  afterEach(() => {
    resetChartViewportCache()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    delete window.__marketChartViewport
  })

  test('setData range events do not overwrite a saved zoom', () => {
    persistChartViewport({ from: 18, to: 23 })
    const { binder, emitRange, setVisibleLogicalRange, fitContent, frames } = createBinder()

    binder.replaceSeriesData(() => {
      emitRange({ from: 0, to: 23 })
    })

    expect(readChartViewport()).toEqual({ from: 18, to: 23 })
    frames.flush()
    expect(setVisibleLogicalRange).toHaveBeenCalledWith({ from: 18, to: 23 })
    expect(fitContent).not.toHaveBeenCalled()

    frames.flush()
    emitRange({ from: 0, to: 23 })
    vi.advanceTimersByTime(200)
    expect(readChartViewport()).toEqual({ from: 18, to: 23 })
  })

  test('applies a viewport saved while restore frames are pending', () => {
    const { binder, setVisibleLogicalRange, fitContent, frames } = createBinder()

    binder.replaceSeriesData(() => undefined)
    persistChartViewport({ from: 18, to: 23 })

    frames.flush()
    expect(fitContent).not.toHaveBeenCalled()
    expect(setVisibleLogicalRange).toHaveBeenCalledWith({ from: 18, to: 23 })
  })

  test('fits content when nothing is saved', () => {
    const { binder, setVisibleLogicalRange, fitContent, frames } = createBinder()

    binder.replaceSeriesData(() => undefined)

    frames.flush()
    expect(fitContent).toHaveBeenCalledOnce()
    expect(setVisibleLogicalRange).not.toHaveBeenCalled()
  })

  test('user zoom is persisted and restored on the next series replace', () => {
    const { binder, host, emitRange, setVisibleLogicalRange, frames } = createBinder()

    host.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
    emitRange({ from: 10, to: 16 })
    expect(readChartViewport()).toEqual({ from: 10, to: 16 })

    binder.replaceSeriesData(() => {
      emitRange({ from: 0, to: 23 })
    })

    frames.flush()
    expect(setVisibleLogicalRange).toHaveBeenCalledWith({ from: 10, to: 16 })
  })
})
