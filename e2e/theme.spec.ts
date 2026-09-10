import { expect, test } from '@playwright/test'

import { mockMarketApis, openApp } from './support/mock-market'

test('/: theme starts dark and toggles to light', async ({ page }) => {
  await openApp(page, '/')

  const toggle = page.getByTestId('theme-toggle')
  await expect(toggle.getByRole('tab', { name: 'Dark' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.getByRole('tab', { name: 'Light' }).click()
  await expect(page.getByRole('tab', { name: 'Light' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('/trainer: stored light theme is applied on load', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('markets.theme', 'light')
  })
  await mockMarketApis(page)
  await page.goto('/trainer')

  await expect(page.getByRole('tab', { name: 'Light' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('theme choice survives reload', async ({ page }) => {
  await mockMarketApis(page)
  await page.goto('/')

  await page.getByRole('tab', { name: 'Light' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('tab', { name: 'Light' })).toHaveAttribute('aria-selected', 'true')
})
