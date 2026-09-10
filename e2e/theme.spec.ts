import { expect, test } from '@playwright/test'

import { mockMarketApis, openApp } from './support/mock-market'

test('/: theme starts dark and toggles to light', async ({ page }) => {
  await openApp(page, '/')

  const toggle = page.getByTestId('theme-toggle')
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(toggle).toContainText('Light')
})

test('/trainer: stored light theme is applied on load', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('markets.theme', 'light')
  })
  await mockMarketApis(page)
  await page.goto('/trainer')

  await expect(page.getByTestId('theme-toggle')).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('theme choice survives reload', async ({ page }) => {
  await mockMarketApis(page)
  await page.goto('/')

  await page.getByTestId('theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByTestId('theme-toggle')).toHaveAttribute('aria-checked', 'true')
})
