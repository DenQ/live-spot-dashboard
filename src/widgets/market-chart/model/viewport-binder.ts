import type { IChartApi, LogicalRange } from 'lightweight-charts'

import { persistChartViewport, readChartViewport, type ChartViewport } from './storage'

export type FrameScheduler = (callback: FrameRequestCallback) => number

export type ChartViewportApi = {
  getVisibleLogicalRange: () => LogicalRange | null
  setVisibleLogicalRange: (range: ChartViewport) => void
  isIdle: () => boolean
}

declare global {
  interface Window {
    __marketChartViewport?: ChartViewportApi
  }
}

function toViewport(range: LogicalRange | ChartViewport | null | undefined): ChartViewport | null {
  if (!range) {
    return null
  }

  const { from, to } = range
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    return null
  }

  return { from, to }
}

export function bindChartViewport(
  chart: IChartApi,
  host: HTMLElement,
  schedule: FrameScheduler = requestAnimationFrame,
) {
  const timeScale = chart.timeScale()
  let restoring = false
  let userAdjusted = false
  let restoreGeneration = 0

  const persistFromUser = (range: LogicalRange | ChartViewport | null) => {
    const viewport = toViewport(range)
    if (restoring || !userAdjusted || !viewport) {
      return
    }

    persistChartViewport(viewport)
  }

  const onLogicalRangeChange = (range: LogicalRange | null) => {
    persistFromUser(range)
  }

  const onUserGesture = () => {
    userAdjusted = true
  }

  timeScale.subscribeVisibleLogicalRangeChange(onLogicalRangeChange)
  host.addEventListener('wheel', onUserGesture, { capture: true, passive: true })
  host.addEventListener('pointerdown', onUserGesture, { capture: true })

  const api: ChartViewportApi = {
    getVisibleLogicalRange: () => timeScale.getVisibleLogicalRange(),
    setVisibleLogicalRange: (range) => {
      const viewport = toViewport(range)
      if (!viewport) {
        return
      }

      userAdjusted = true
      persistChartViewport(viewport)
      timeScale.setVisibleLogicalRange(viewport)
    },
    isIdle: () => !restoring,
  }

  window.__marketChartViewport = api

  return {
    replaceSeriesData(write: () => void, options?: { restore?: boolean }) {
      restoring = true
      restoreGeneration += 1
      const generation = restoreGeneration
      const shouldRestore = options?.restore !== false

      write()

      if (!shouldRestore) {
        restoring = false
        return
      }

      schedule(() => {
        if (generation !== restoreGeneration) {
          return
        }

        const saved = readChartViewport()
        if (saved) {
          timeScale.setVisibleLogicalRange(saved)
        } else {
          timeScale.fitContent()
        }

        schedule(() => {
          if (generation !== restoreGeneration) {
            return
          }

          restoring = false
        })
      })
    },
    destroy() {
      restoreGeneration += 1
      timeScale.unsubscribeVisibleLogicalRangeChange(onLogicalRangeChange)
      host.removeEventListener('wheel', onUserGesture, { capture: true })
      host.removeEventListener('pointerdown', onUserGesture, { capture: true })
      if (window.__marketChartViewport === api) {
        delete window.__marketChartViewport
      }
    },
  }
}

export type ChartViewportBinder = ReturnType<typeof bindChartViewport>
