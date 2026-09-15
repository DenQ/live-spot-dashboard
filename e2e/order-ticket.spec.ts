import { expect, test } from '@playwright/test'

import { openApp } from './support/mock-market'

test('/trainer: ticket qty, limit, and amount stay in sync', async ({ page }) => {
  await openApp(page, '/trainer')

  await expect(page.getByRole('heading', { name: 'Ticket' })).toBeVisible()

  const limitMode = page.getByRole('button', { name: 'Auto: follows last price. Click to set the limit yourself.' })
  await expect(limitMode).toHaveAttribute('title', 'Auto: follows last price. Click to set the limit yourself.')
  await limitMode.click()

  const qty = page.getByTestId('ticket-qty')
  const amount = page.getByTestId('ticket-amount')
  const limit = page.getByTestId('ticket-limit')

  await limit.fill('40000')
  await qty.fill('0.01')
  await expect(amount).toHaveValue('400')

  await amount.fill('100')
  await expect(qty).toHaveValue('0.0025')

  await limit.fill('20000')
  await expect(qty).toHaveValue('0.005')
  await expect(amount).toHaveValue('100')

  await qty.fill('0.01')
  await expect(qty).toHaveValue('0.01')
  await expect(amount).toHaveValue('200')
})

test('/trainer: All fills max cash and Buy is blocked when the bid is too large', async ({ page }) => {
  await openApp(page, '/trainer')

  await page.getByRole('button', { name: 'Auto: follows last price. Click to set the limit yourself.' }).click()

  const qty = page.getByTestId('ticket-qty')
  const amount = page.getByTestId('ticket-amount')
  const limit = page.getByTestId('ticket-limit')
  const buy = page.getByTestId('ticket-buy')
  const all = page.getByTestId('ticket-amount-all')

  await expect(all).toHaveAttribute('title', 'Spend all cash, minus the fee')

  await limit.fill('40000')
  await all.click()

  const maxAmount = Number(await amount.inputValue())
  expect(maxAmount).toBeGreaterThan(990)
  expect(maxAmount).toBeLessThanOrEqual(1000)
  await expect(qty).not.toHaveValue('')
  await expect(buy).not.toHaveAttribute('title', 'Not enough cash for this bid')

  await amount.fill('5000')
  await expect(buy).toHaveAttribute('title', 'Not enough cash for this bid')
  await expect(buy).toBeDisabled()

  await amount.fill('100')
  await expect(qty).toHaveValue('0.0025')
  await expect(buy).not.toHaveAttribute('title', 'Not enough cash for this bid')
})
