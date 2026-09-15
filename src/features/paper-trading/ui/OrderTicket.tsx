import { useMemo, useState } from 'react'

import type { PaperSide } from '@entities/paper-account'
import { useMarketFeed, useQuotes } from '@features/market-feed'
import { PAPER } from '@shared/config'
import { formatPrice, formatQty, formatSignedCompactUsd, formatUsd } from '@shared/lib'
import { Panel } from '@shared/ui'

import {
  canAffordBuy,
  deriveAmount,
  formatTicketAmount,
  formatTicketQty,
  maxBuyNotional,
  nextTicketFields,
  qtyForMaxBuy,
  type TicketFieldAction,
  type TicketFields,
} from '../model/ticket-fields'
import { usePaperTrading } from '../model/use-paper-trading'
import styles from './OrderTicket.module.css'

export function OrderTicket() {
  const { symbol } = useMarketFeed()
  const { ticketPrefill } = usePaperTrading()
  const seeded = ticketPrefill?.instrumentId === symbol
  const ticketKey = `${symbol}:${seeded ? ticketPrefill.generation : 0}`

  return (
    <OrderTicketFields
      key={ticketKey}
      initialQty={seeded ? ticketPrefill.qty : '0.01'}
      initialLimit={seeded ? ticketPrefill.limit : undefined}
      hintedSide={seeded ? ticketPrefill.side : undefined}
    />
  )
}

function OrderTicketFields({
  initialQty,
  initialLimit,
  hintedSide,
}: {
  initialQty: string
  initialLimit?: string
  hintedSide?: PaperSide
}) {
  const { instruments, symbol, quoteStatus } = useMarketFeed()
  const quotesById = useQuotes()
  const { submit, freeQty, account } = usePaperTrading()
  const instrument = instruments.find((item) => item.id === symbol)
  const last = quotesById[symbol]?.last
  const position = account.positions[symbol]
  const [draft, setDraft] = useState<TicketFields>({ qty: initialQty, amount: '', driver: 'qty' })
  const [limitDraft, setLimitDraft] = useState<string | null>(initialLimit ?? null)
  const [error, setError] = useState<string | null>(null)
  const autoLimit = limitDraft === null
  const limit = autoLimit ? (Number.isFinite(last) ? String(last) : '') : limitDraft
  const limitValue = Number(limit)
  const fields = nextTicketFields(draft, { type: 'limit', limit: limitValue })
  const qtyValue = Number(fields.qty)
  const notional = qtyValue > 0 && limitValue > 0 ? qtyValue * limitValue : 0
  const fee = notional * PAPER.takerFee
  const total = notional + fee
  const sellable = freeQty(symbol)
  const live = quoteStatus === 'live' && Number.isFinite(last)
  const affordable = canAffordBuy(qtyValue, limitValue, account.cash, PAPER.takerFee)
  const sellPreview =
    live && position && qtyValue > 0 && limitValue > 0 && qtyValue <= sellable + 1e-8
      ? qtyValue * limitValue * (1 - PAPER.takerFee) - qtyValue * position.avgPrice
      : null
  const modeHint = autoLimit
    ? 'Auto: follows last price. Click to set the limit yourself.'
    : 'Manual: your limit. Click to follow last price.'

  const hint = useMemo(() => {
    if (!instrument) {
      return 'Select a pair'
    }

    return `${instrument.ticker} · Fee ${(PAPER.takerFee * 100).toFixed(2)}% · delayed fill`
  }, [instrument])

  const patchFields = (action: TicketFieldAction) => {
    setDraft((current) => nextTicketFields(current, action))
    setError(null)
  }

  const fillMaxSell = () => {
    patchFields({ type: 'qty', value: String(sellable || 0.01), limit: limitValue })
  }

  const fillMaxCash = () => {
    if (!(limitValue > 0)) {
      patchFields({
        type: 'amount',
        value: formatTicketAmount(maxBuyNotional(account.cash, PAPER.takerFee)),
        limit: limitValue,
      })
      return
    }

    const qty = qtyForMaxBuy(account.cash, limitValue, PAPER.takerFee)
    const amount = deriveAmount(formatTicketQty(qty), limitValue)
    if (!amount) {
      return
    }

    patchFields({ type: 'amount', value: amount, limit: limitValue })
  }

  const place = (side: PaperSide) => {
    if (!instrument) {
      return
    }

    const message = submit({
      instrumentId: instrument.id,
      ticker: instrument.ticker,
      side,
      qty: qtyValue,
      limit: limitValue,
    })

    setError(message)
  }

  return (
    <Panel title="Ticket" hint={hint}>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <div className={styles.row}>
          <label className={styles.field}>
            <span>Quantity</span>
            <input
              inputMode="decimal"
              value={fields.qty}
              aria-label="Quantity"
              data-testid="ticket-qty"
              onChange={(event) => {
                patchFields({ type: 'qty', value: event.target.value, limit: limitValue })
              }}
            />
            <button type="button" className={styles.ghost} onClick={fillMaxSell}>
              Max sell {formatQty(sellable)}
            </button>
          </label>
          <div className={styles.field}>
            <span>Amount</span>
            <div className={styles.control}>
              <input
                inputMode="decimal"
                value={fields.amount}
                aria-label="Amount USD"
                data-testid="ticket-amount"
                onChange={(event) => {
                  patchFields({ type: 'amount', value: event.target.value, limit: limitValue })
                }}
              />
              <button
                type="button"
                className={styles.all}
                aria-label="Spend all cash"
                data-testid="ticket-amount-all"
                disabled={account.cash <= 0}
                onClick={fillMaxCash}
              >
                All
              </button>
            </div>
          </div>
        </div>
        <div className={styles.field}>
          <span>Limit</span>
          <div className={styles.control}>
            <input
              inputMode="decimal"
              readOnly={autoLimit}
              value={limit}
              aria-label="Limit price"
              data-testid="ticket-limit"
              onChange={(event) => {
                setLimitDraft(event.target.value)
                setError(null)
              }}
            />
            <button
              type="button"
              className={styles.mode}
              data-mode={autoLimit ? 'auto' : 'manual'}
              title={modeHint}
              aria-label={modeHint}
              aria-pressed={autoLimit}
              onClick={() => {
                setLimitDraft(autoLimit ? limit : null)
                setError(null)
              }}
            >
              {autoLimit ? <SparklesIcon /> : <PencilIcon />}
            </button>
          </div>
          <span className={styles.meta}>Last {Number.isFinite(last) ? formatPrice(last) : '—'}</span>
        </div>
        <p className={styles.notional}>
          Fee {formatUsd(fee)} · Cash {formatUsd(account.cash)} · Total {formatUsd(total)}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.buy}
            data-testid="ticket-buy"
            data-hint={hintedSide === 'buy' ? 'on' : undefined}
            disabled={!live || !affordable}
            title={!affordable ? 'Not enough cash for this bid' : undefined}
            onClick={() => place('buy')}
          >
            Buy
          </button>
          <button
            type="button"
            className={styles.sell}
            data-hint={hintedSide === 'sell' ? 'on' : undefined}
            disabled={!live || sellable <= 0}
            onClick={() => place('sell')}
          >
            Sell
            {sellPreview !== null ? (
              <span className={styles.actionHint}>{formatSignedCompactUsd(sellPreview)}</span>
            ) : null}
          </button>
        </div>
        {error ? <p className={styles.error}>{error}</p> : null}
        <p className={styles.note}>Not instant. Price can move. The book may miss you.</p>
      </form>
    </Panel>
  )
}

function SparklesIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M8 1.2 9.1 5 13 6.1 9.1 7.2 8 11 6.9 7.2 3 6.1 6.9 5 8 1.2Zm4.6 7.4 0.7 2.2 2.2.7-2.2.7-.7 2.2-.7-2.2-2.2-.7 2.2-.7.7-2.2Z"
      />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M11.6 1.8a1.4 1.4 0 0 1 2 2L5.7 11.7 2.5 13.5l1.8-3.2 7.3-8.5Zm-8 11.1 1.1-.6-.5-.5-.6 1.1Z"
      />
    </svg>
  )
}
