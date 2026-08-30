import { useSyncExternalStore } from 'react'

import { getQuotesSnapshot, subscribeQuoteSnapshot } from './quotes-store'

export function useQuotes() {
  return useSyncExternalStore(subscribeQuoteSnapshot, getQuotesSnapshot, getQuotesSnapshot)
}
