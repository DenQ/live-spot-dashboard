import { expect, test } from '@playwright/test'

import { openApp } from './support/mock-market'

test('/trainer: hints stay off until toggled, then the coach panel appears', async ({ page }) => {
  await openApp(page, '/trainer')

  const toggle = page.getByTestId('hints-toggle')
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByTestId('coach-panel')).toHaveCount(0)

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByTestId('coach-panel')).toBeVisible()
  await expect(page.getByText('Practice filter, not financial advice.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ticket' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Hint' })).toBeVisible()
  await expect(page.getByTestId('pair-hint-BTCUSDT')).toBeVisible()

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByTestId('coach-panel')).toHaveCount(0)
  await expect(page.getByRole('columnheader', { name: 'Hint' })).toHaveCount(0)
})

test('/: hints toggle is available without a coach panel', async ({ page }) => {
  await openApp(page, '/')

  await expect(page.getByTestId('hints-toggle')).toBeVisible()
  await expect(page.getByTestId('coach-panel')).toHaveCount(0)
})
