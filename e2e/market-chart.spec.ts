import { expect, test, type Page } from '@playwright/test'

import { openApp } from './support/mock-market'

async function expectChartReady(page: Page, ticker: string) {
  await expect(page.getByTestId('chart-loading')).toHaveCount(0)
  await expect(page.getByTestId('market-chart')).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByText(`${ticker} · 1h`)).toBeVisible()
  await expect(page.getByTestId('chart-canvas').locator('canvas').first()).toBeVisible()
}

async function selectPair(page: Page, symbol: string) {
  await page.getByTestId(`pair-${symbol}`).click()
}

test.describe('market chart pair selection', () => {
  for (const path of ['/', '/trainer'] as const) {
    test(`${path}: keeps the chart when clicking the already selected pair`, async ({ page }) => {
      await openApp(page, path)
      await expectChartReady(page, 'BTCUSDT')

      await selectPair(page, 'BTCUSDT')
      await expect(page.getByTestId(`pair-BTCUSDT`)).toHaveAttribute('aria-selected', 'true')
      await expectChartReady(page, 'BTCUSDT')
    })

    test(`${path}: keeps the chart when selecting another pair and clicking it again`, async ({ page }) => {
      await openApp(page, path)
      await expectChartReady(page, 'BTCUSDT')

      await selectPair(page, 'ETHUSDT')
      await expect(page.getByTestId(`pair-ETHUSDT`)).toHaveAttribute('aria-selected', 'true')
      await expectChartReady(page, 'ETHUSDT')

      await selectPair(page, 'ETHUSDT')
      await expect(page.getByTestId('chart-loading')).toHaveCount(0)
      await expectChartReady(page, 'ETHUSDT')
    })
  }

  test('/: keeps the chart when clicking the same pair again after 4s', async ({ page }) => {
    test.setTimeout(20_000)
    await openApp(page, '/')
    await expectChartReady(page, 'BTCUSDT')

    await selectPair(page, 'ETHUSDT')
    await expectChartReady(page, 'ETHUSDT')

    await page.waitForTimeout(4_000)
    await selectPair(page, 'ETHUSDT')

    await expect(page.getByTestId('chart-loading')).toHaveCount(0)
    await expectChartReady(page, 'ETHUSDT')
  })

  test('/: candle socket drop after 3s then same-row click keeps the chart', async ({ page }) => {
    test.setTimeout(20_000)
    await openApp(page, '/', { dropKlineAfterMs: 3_000 })
    await expectChartReady(page, 'BTCUSDT')

    await selectPair(page, 'ETHUSDT')
    await expectChartReady(page, 'ETHUSDT')

    await page.waitForTimeout(4_000)
    await expect(page.getByTestId('chart-loading')).toHaveCount(0)

    await selectPair(page, 'ETHUSDT')
    await expectChartReady(page, 'ETHUSDT')
  })
})
