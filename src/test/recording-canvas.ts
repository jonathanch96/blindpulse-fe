// A recording 2D context.
//
// jsdom has no canvas implementation, and mocking one would be beside the point anyway: what these
// tests need to know is not what pixels came out but *what the renderer asked for* — whether a
// forming bar was stroked rather than filled, whether a tint actually carried an alpha.
//
// Style properties are captured at the moment of each call rather than at the end, because the
// renderers set fillStyle immediately before each shape and the final value says nothing about
// what any particular shape was painted with. That distinction is the whole reason `withAlpha`
// could be broken for a slice without a single test noticing.

export type RecordedCall = {
  op: string
  args: number[]
  fillStyle: string
  strokeStyle: string
  lineWidth: number
  lineDash: number[]
  font: string
  globalAlpha: number
}

export type RecordingContext = CanvasRenderingContext2D & {
  calls: RecordedCall[]
  /** Every call of one kind, in order. */
  where: (op: string) => RecordedCall[]
  texts: { text: string; x: number; y: number }[]
}

const numericOps = [
  "clearRect", "fillRect", "strokeRect", "moveTo", "lineTo", "arc", "rect",
  "beginPath", "stroke", "fill", "closePath", "save", "restore", "translate", "scale", "setTransform",
] as const

export function createRecordingContext(): RecordingContext {
  const calls: RecordedCall[] = []
  const texts: { text: string; x: number; y: number }[] = []

  const state = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineDash: [] as number[],
    font: "",
    globalAlpha: 1,
  }

  const record = (op: string, args: number[]) => {
    calls.push({
      op,
      args,
      fillStyle: String(state.fillStyle),
      strokeStyle: String(state.strokeStyle),
      lineWidth: state.lineWidth,
      lineDash: [...state.lineDash],
      font: state.font,
      globalAlpha: state.globalAlpha,
    })
  }

  const context = {
    get fillStyle() { return state.fillStyle },
    set fillStyle(value: string) { state.fillStyle = value },
    get strokeStyle() { return state.strokeStyle },
    set strokeStyle(value: string) { state.strokeStyle = value },
    get lineWidth() { return state.lineWidth },
    set lineWidth(value: number) { state.lineWidth = value },
    get font() { return state.font },
    set font(value: string) { state.font = value },
    get globalAlpha() { return state.globalAlpha },
    set globalAlpha(value: number) { state.globalAlpha = value },
    textBaseline: "alphabetic",
    textAlign: "start",

    setLineDash: (dash: number[]) => {
      state.lineDash = [...dash]
      record("setLineDash", dash)
    },
    getLineDash: () => [...state.lineDash],
    fillText: (text: string, x: number, y: number) => {
      texts.push({ text, x, y })
      record("fillText", [x, y])
    },
    strokeText: (text: string, x: number, y: number) => {
      texts.push({ text, x, y })
      record("strokeText", [x, y])
    },
    // A width proportional to the string is enough for layout maths that only needs *a* number.
    measureText: (text: string) => ({ width: text.length * 6 }) as TextMetrics,

    calls,
    texts,
    where: (op: string) => calls.filter((call) => call.op === op),
  } as unknown as RecordingContext

  for (const op of numericOps) {
    ;(context as unknown as Record<string, unknown>)[op] = (...args: number[]) => record(op, args)
  }
  return context
}

/** True when a colour string carries an alpha channel — the property `withAlpha` exists to add. */
export function hasAlpha(color: string): boolean {
  return /\/\s*0?\.\d+\s*\)/.test(color) || /rgba?\([^)]*,\s*0?\.\d+\s*\)/.test(color)
}
