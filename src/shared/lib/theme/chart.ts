import { cssVar } from './css-var'

export type ChartPalette = {
  text: string
  up: string
  down: string
  gridVert: string
  gridHorz: string
  borderY: string
  borderX: string
  volumeUp: string
  volumeDown: string
}

export function readChartPalette(): ChartPalette {
  return {
    text: cssVar('--text-muted'),
    up: cssVar('--up'),
    down: cssVar('--down'),
    gridVert: cssVar('--chart-grid-vert'),
    gridHorz: cssVar('--chart-grid-horz'),
    borderY: cssVar('--chart-border-y'),
    borderX: cssVar('--chart-border-x'),
    volumeUp: cssVar('--volume-up'),
    volumeDown: cssVar('--volume-down'),
  }
}
