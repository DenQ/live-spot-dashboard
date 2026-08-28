import type { PaperAccount } from '@entities/paper-account'
import { APP_STORAGE_KEYS } from '@shared/config'
import { isRecord } from '@shared/lib'

import { createAccount } from './engine'

function isAccount(value: unknown): value is PaperAccount {
  if (!isRecord(value) || value.version !== 1 || typeof value.cash !== 'number') {
    return false
  }

  return isRecord(value.positions) && Array.isArray(value.orders) && Array.isArray(value.ledger)
}

export function readStoredAccount(): PaperAccount {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEYS.paper)
    if (!raw) {
      return createAccount()
    }

    const parsed: unknown = JSON.parse(raw)
    if (isAccount(parsed) && Number.isFinite(parsed.cash)) {
      return parsed
    }
  } catch {
    // ignore
  }

  return createAccount()
}

export function persistAccount(account: PaperAccount) {
  try {
    localStorage.setItem(APP_STORAGE_KEYS.paper, JSON.stringify(account))
  } catch {
    // ignore
  }
}
