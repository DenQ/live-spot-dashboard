import {
  LineStyle,
  type DrawingUtils,
  type IPrimitivePaneRenderer,
  type IPrimitivePaneView,
  type ISeriesPrimitive,
  type SeriesAttachedParameter,
  type Time,
} from 'lightweight-charts'

type PaneTarget = Parameters<IPrimitivePaneRenderer['draw']>[0]

export type BuyTimeLineOptions = {
  time: Time | null
  price: number
  color: string
}

export function createBuyTimeLine({ time, price, color }: BuyTimeLineOptions): ISeriesPrimitive<Time> {
  let chart: SeriesAttachedParameter<Time>['chart'] | null = null
  let x: number | null = null

  const updateAllViews = () => {
    if (time == null) {
      x = null
      return
    }

    const coordinate = chart?.timeScale().timeToCoordinate(time)
    x = coordinate == null ? null : coordinate
  }

  const views: IPrimitivePaneView[] = [
    {
      zOrder: () => 'top',
      renderer: () => ({
        draw(target: PaneTarget, utils?: DrawingUtils) {
          if (x === null) {
            return
          }

          const lineX = x

          target.useBitmapCoordinateSpace((scope) => {
            const ctx = scope.context
            const xPosition = Math.round(lineX * scope.horizontalPixelRatio)

            ctx.beginPath()
            ctx.strokeStyle = color
            utils?.setLineStyle(ctx, LineStyle.Dashed)
            ctx.lineWidth = Math.max(1, Math.round(scope.horizontalPixelRatio))
            ctx.moveTo(xPosition, 0)
            ctx.lineTo(xPosition, scope.bitmapSize.height)
            ctx.stroke()
          })
        },
      }),
    },
  ]

  return {
    attached(param) {
      chart = param.chart
      updateAllViews()
    },
    detached() {
      chart = null
    },
    updateAllViews,
    paneViews: () => views,
    autoscaleInfo() {
      return {
        priceRange: {
          minValue: price,
          maxValue: price,
        },
      }
    },
  }
}
