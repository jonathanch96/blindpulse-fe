// The chart's numeric kernel.
//
// ESLint bans `Number()` and `parseFloat` inside `src/features/**` because a price that has been
// through a float is not the price the server quoted. That ban is worth keeping absolute, so the
// arithmetic that genuinely needs floating point — pixel geometry, moving averages, an RSI — lives
// here instead, in one documented file outside that tree. (The backend has `pkg/stats` for exactly
// the same reason.)
//
// Nothing here may be used for a value that is stored, sent, or shown as a number to the trader.
// It exists to turn decimal strings into screen coordinates and indicator series.

/** Converts a decimal string to a plot value. Display geometry only — never a traded quantity. */
export function toPlotValue(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export type ScaleMode = "auto" | "log" | "percent"

export type Scale = {
  /** Maps a price to a y coordinate, where 0 is the top of the plot area. */
  toY: (price: number) => number
  /** The ticks to label, in price space. */
  ticks: number[]
  /** Renders a tick for the axis, in the units the current mode implies. */
  format: (price: number) => string
}

/**
 * Builds the price scale.
 *
 * `auto` is linear between the window's extremes. `log` is linear in log space, which is what makes
 * a 10% move look the same size at any price level. `percent` rebases to the first close, so the
 * axis reads in return terms.
 *
 * A log scale needs strictly positive inputs. Blinded prices always are — the normalization
 * guarantees it — but a degenerate window would otherwise produce NaN coordinates and a blank
 * chart, so it falls back to linear rather than drawing nothing.
 */
export function buildScale(
  mode: ScaleMode,
  low: number,
  high: number,
  height: number,
  basePrice: number,
  tickCount = 6,
): Scale {
  if (!Number.isFinite(low) || !Number.isFinite(high) || high === low || height <= 0) {
    return { toY: () => height / 2, ticks: [], format: (price) => price.toFixed(2) }
  }

  if (mode === "log" && low > 0 && high > 0) {
    const logLow = Math.log(low)
    const logHigh = Math.log(high)
    return {
      toY: (price) => {
        if (price <= 0) return height
        return height - ((Math.log(price) - logLow) / (logHigh - logLow)) * height
      },
      ticks: niceTicks(low, high, tickCount),
      format: (price) => price.toFixed(decimalsFor(high - low)),
    }
  }

  const toY = (price: number) => height - ((price - low) / (high - low)) * height

  if (mode === "percent" && basePrice > 0) {
    return {
      toY,
      ticks: niceTicks(low, high, tickCount),
      // Signed, because a return without a direction reads as a quantity.
      format: (price) => {
        const change = ((price - basePrice) / basePrice) * 100
        return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`
      },
    }
  }

  return { toY, ticks: niceTicks(low, high, tickCount), format: (price) => price.toFixed(decimalsFor(high - low)) }
}

/** Chooses tick values on round numbers rather than at even pixel intervals. */
export function niceTicks(low: number, high: number, count: number): number[] {
  if (!(high > low) || count < 2) return []
  const rawStep = (high - low) / (count - 1)
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const normalized = rawStep / magnitude
  // Round the raw step *up* to the next nice multiplier. The comparisons must be strict and in
  // descending order, or a step of exactly 2 rounds to 5 and the axis lands on 50s where it should
  // land on 20s.
  const step = (normalized > 5 ? 10 : normalized > 2 ? 5 : normalized > 1 ? 2 : 1) * magnitude
  const first = Math.ceil(low / step) * step
  const ticks: number[] = []
  for (let value = first; value <= high + step * 0.001; value += step) {
    ticks.push(Number(value.toFixed(10)))
  }
  return ticks
}

function decimalsFor(range: number): number {
  if (range >= 100) return 2
  if (range >= 1) return 3
  if (range >= 0.01) return 4
  return 5
}

/**
 * Exponential moving average.
 *
 * Seeded with the first close rather than a simple average of the first `period` values. That makes
 * the series defined from bar 0, which matters here: a replay hands the trader a warmup window and
 * then advances one bar at a time, so an indicator that only starts after 200 bars would be blank
 * exactly when they are deciding whether to take the first trade.
 */
export function ema(closes: number[], period: number): number[] {
  if (closes.length === 0 || period < 1) return []
  const k = 2 / (period + 1)
  const out: number[] = []
  let previous = closes[0]!
  for (const close of closes) {
    previous = close * k + previous * (1 - k)
    out.push(previous)
  }
  return out
}

/**
 * Wilder's RSI. Returns NaN for the bars before the period is satisfied, so the renderer can skip
 * them instead of drawing a line that pretends to mean something.
 */
export function rsi(closes: number[], period = 14): number[] {
  const out = new Array<number>(closes.length).fill(Number.NaN)
  if (closes.length <= period) return out

  let gains = 0
  let losses = 0
  for (let i = 1; i <= period; i++) {
    const change = closes[i]! - closes[i - 1]!
    if (change >= 0) gains += change
    else losses -= change
  }
  let averageGain = gains / period
  let averageLoss = losses / period
  out[period] = rsiFrom(averageGain, averageLoss)

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i]! - closes[i - 1]!
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0
    averageGain = (averageGain * (period - 1) + gain) / period
    averageLoss = (averageLoss * (period - 1) + loss) / period
    out[i] = rsiFrom(averageGain, averageLoss)
  }
  return out
}

function rsiFrom(averageGain: number, averageLoss: number): number {
  // No losses at all is not "infinitely strong": RSI is capped at 100 by definition, and dividing
  // by zero here would put Infinity into a pixel coordinate.
  if (averageLoss === 0) return averageGain === 0 ? 50 : 100
  const rs = averageGain / averageLoss
  return 100 - 100 / (1 + rs)
}
