import type { Quote } from '@entities/quote'

import { mergeQuote } from './quotes'

const UI_FLUSH_MS = 100

let live: Record<string, Quote> = {}
let snapshot: Record<string, Quote> = {}
const listeners = new Set<() => void>()

let raf = 0
let timer: ReturnType<typeof setTimeout> | undefined
let lastFlush = 0

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

function cancelScheduled() {
  if (raf) {
    cancelAnimationFrame(raf)
    raf = 0
  }

  if (timer !== undefined) {
    clearTimeout(timer)
    timer = undefined
  }
}

function flush() {
  raf = 0
  timer = undefined
  lastFlush = performance.now()

  if (snapshot === live) {
    return
  }

  snapshot = live
  emit()
}

function scheduleFlush() {
  if (raf || timer !== undefined) {
    return
  }

  const wait = Math.max(0, UI_FLUSH_MS - (performance.now() - lastFlush))
  const run = () => {
    raf = requestAnimationFrame(flush)
  }

  if (wait === 0) {
    run()
    return
  }

  timer = setTimeout(run, wait)
}

export function getLiveQuotes() {
  return live
}

export function getQuotesSnapshot() {
  return snapshot
}

export function subscribeQuoteSnapshot(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function resetQuotes() {
  cancelScheduled()
  live = {}
  snapshot = live
  emit()
}

export function replaceQuotes(next: Record<string, Quote>) {
  cancelScheduled()
  live = next
  snapshot = next
  lastFlush = performance.now()
  emit()
}

export function applyQuote(quote: Quote) {
  const next = mergeQuote(live, quote)
  if (next === live) {
    return
  }

  live = next
  scheduleFlush()
}
