import { expect, test, type Page } from '@playwright/test'

import { openApp } from './support/mock-market'

type LogicalRange = { from: number; to: number }

async function expectChartReady(page: Page, ticker: string) {
  await expect(page.getByTestId('chart-loading')).toHaveCount(0)
  await expect(page.getByTestId('market-chart')).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByText(`${ticker} · 1h`)).toBeVisible()
  await expect(page.getByTestId('chart-canvas').locator('canvas').first()).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.__marketChartViewport?.isIdle() ?? false)).toBe(true)
}

async function getChartRange(page: Page): Promise<LogicalRange | null> {
  return page.evaluate(() => window.__marketChartViewport?.getVisibleLogicalRange() ?? null)
}

async function setChartRange(page: Page, range: LogicalRange) {
  await page.evaluate((next) => {
    window.__marketChartViewport?.setVisibleLogicalRange(next)
  }, range)
}

test.describe('market chart viewport', () => {
  test('keeps zoom when switching pairs', async ({ page }) => {
    await openApp(page, '/')
    await expectChartReady(page, 'BTCUSDT')

    const zoomed = { from: 18, to: 23 }
    await setChartRange(page, zoomed)
    await expect.poll(() => page.evaluate(() => window.__marketChartViewport?.isIdle() ?? false)).toBe(true)

    await expect.poll(async () => {
      const range = await getChartRange(page)
      return range && Math.abs(range.from - zoomed.from) < 1 && Math.abs(range.to - zoomed.to) < 1
    }).toBe(true)

    await expect.poll(() => page.evaluate(() => localStorage.getItem('markets.chart.viewport'))).toContain(
      '"from"',
    )

    await page.getByTestId('pair-ETHUSDT').click()
    await expectChartReady(page, 'ETHUSDT')

    await expect.poll(async () => {
      const range = await getChartRange(page)
      return range && Math.abs(range.from - zoomed.from) < 1 && Math.abs(range.to - zoomed.to) < 1
    }).toBe(true)
  })

  test('keeps wheel zoom when switching pairs', async ({ page }) => {
    await openApp(page, '/')
    await expectChartReady(page, 'BTCUSDT')

    const before = await getChartRange(page)
    const canvas = page.getByTestId('chart-canvas').locator('canvas').first()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.move(box!.x + box!.width * 0.75, box!.y + box!.height * 0.45)

    for (let step = 0; step < 10; step += 1) {
      await page.mouse.wheel(0, -180)
      await page.waitForTimeout(40)
    }

    const afterZoom = await getChartRange(page)

    expect(afterZoom).not.toBeNull()
    expect(before).not.toBeNull()
    expect(afterZoom!.to - afterZoom!.from).toBeLessThan((before!.to - before!.from) * 0.9)

    await page.getByTestId('pair-ETHUSDT').click()
    await expectChartReady(page, 'ETHUSDT')

    const afterSwitch = await getChartRange(page)

    expect(afterSwitch).not.toBeNull()
    expect(afterSwitch!.to - afterSwitch!.from).toBeCloseTo(afterZoom!.to - afterZoom!.from, 0)
    expect(afterSwitch!.from).toBeCloseTo(afterZoom!.from, 0)
  })
})
