import { memo } from 'react'

type SparklineProps = {
  values: number[]
  up: boolean
}

const WIDTH = 100
const HEIGHT = 28
const PAD = 1

function sameValues(left: number[], right: number[]) {
  if (left === right) {
    return true
  }

  if (left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false
    }
  }

  return true
}

export const Sparkline = memo(
  function Sparkline({ values, up }: SparklineProps) {
    if (values.length < 2) {
      return <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" />
    }

    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || 1
    const step = (WIDTH - PAD * 2) / (values.length - 1)
    const points = values
      .map((value, index) => {
        const x = PAD + index * step
        const y = HEIGHT - PAD - ((value - min) / span) * (HEIGHT - PAD * 2)
        return `${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(' ')

    return (
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
        <polyline
          fill="none"
          stroke={up ? 'var(--up)' : 'var(--down)'}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
      </svg>
    )
  },
  (prev, next) => prev.up === next.up && sameValues(prev.values, next.values),
)
