import { describe, expect, test } from 'vitest'

import { createBuyTimeLine } from './buy-time-line'

describe('createBuyTimeLine', () => {
  test('keeps the buy price in the autoscale range even without a time', () => {
    const marker = createBuyTimeLine({ time: null, price: 40_012, color: '#ffe14d' })

    expect(marker.autoscaleInfo?.(0, 10)).toEqual({
      priceRange: { minValue: 40_012, maxValue: 40_012 },
    })
  })
})
