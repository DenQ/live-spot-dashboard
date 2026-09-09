import { describe, expect, test } from 'vitest'

import { lastPercent, toPercentLine } from './percent-line'

test('toPercentLine normalizes closes to percent from the first bar', () => {
  const line = toPercentLine([
    { time: 1, close: 100 },
    { time: 2, close: 110 },
    { time: 3, close: 90 },
  ])

  expect(line.map((point) => point.value)[0]).toBe(0)
  expect(line[1].value).toBeCloseTo(10)
  expect(line[2].value).toBeCloseTo(-10)
})

test('toPercentLine skips empty or zero origin', () => {
  expect(toPercentLine([])).toEqual([])
  expect(toPercentLine([{ time: 1, close: 0 }])).toEqual([])
})

test('lastPercent returns the latest percent', () => {
  expect(lastPercent([{ time: 1, close: 50 }, { time: 2, close: 55 }])).toBeCloseTo(10)
})
