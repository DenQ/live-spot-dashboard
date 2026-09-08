import { expect, test } from '@playwright/test'

test.describe('live market chart', () => {
  test.skip(!process.env.LIVE_MARKET_E2E, 'set LIVE_MARKET_E2E=1 to hit a real exchange')

  test('click ETHUSDT, wait 4s, click ETHUSDT again', async ({ page }) => {
    test.setTimeout(45_000)

    await page.addInitScript(() => {
      localStorage.clear()
    })
    await page.goto('/')

    await expect(page.getByTestId('chart-loading')).toHaveCount(0, { timeout: 20_000 })
    await expect(page.getByText('BTCUSDT · 1h')).toBeVisible()

    await page.getByTestId('pair-ETHUSDT').click()
    await expect(page.getByTestId('pair-ETHUSDT')).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('ETHUSDT · 1h')).toBeVisible()
    await expect(page.getByTestId('chart-loading')).toHaveCount(0, { timeout: 20_000 })
    await expect(page.getByTestId('market-chart')).toHaveAttribute('aria-busy', 'false')

    await page.waitForTimeout(4_000)
    await page.getByTestId('pair-ETHUSDT').click()

    await expect(page.getByTestId('chart-loading')).toHaveCount(0)
    await expect(page.getByTestId('market-chart')).toHaveAttribute('aria-busy', 'false')
    await expect(page.getByText('ETHUSDT · 1h')).toBeVisible()
    await expect(page.getByTestId('chart-canvas').locator('canvas').first()).toBeVisible()
  })
})
