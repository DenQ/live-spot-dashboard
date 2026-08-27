export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) {
    return '—'
  }

  if (Math.abs(value) >= 1000) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  }

  if (Math.abs(value) >= 1) {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  }

  return value.toLocaleString('en-US', { maximumFractionDigits: 6 })
}

export function formatPct(value: number): string {
  if (!Number.isFinite(value)) {
    return '—'
  }

  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatVolume(value: number): string {
  if (!Number.isFinite(value) || value === 0) {
    return '—'
  }

  return Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value)
}