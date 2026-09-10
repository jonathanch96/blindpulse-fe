// Chart colours come from the same CSS custom properties the rest of the app uses, read once per
// render pass. That is what lets one renderer serve both design systems: switching theme rewrites
// the tokens, and the next frame picks them up. A palette hardcoded here would be a second source
// of truth that drifts the first time either theme is adjusted.

export type ChartPalette = {
  bullish: string
  bearish: string
  telemetry: string
  foreground: string
  muted: string
  seam: string
  panel: string
}

const fallback: ChartPalette = {
  bullish: "#00F0A8",
  bearish: "#FF4D6D",
  telemetry: "#00D2FF",
  foreground: "#F8FAFC",
  muted: "#94A3B8",
  seam: "#1E2433",
  panel: "#141822",
}

export function readPalette(element: HTMLElement | null): ChartPalette {
  if (typeof window === "undefined" || !element) return fallback
  const styles = window.getComputedStyle(element)
  const read = (token: string, backstop: string) => {
    const value = styles.getPropertyValue(token).trim()
    return value === "" ? backstop : value
  }
  return {
    bullish: read("--bullish", fallback.bullish),
    bearish: read("--bearish", fallback.bearish),
    telemetry: read("--telemetry", fallback.telemetry),
    foreground: read("--foreground", fallback.foreground),
    muted: read("--muted-foreground", fallback.muted),
    seam: read("--seam", fallback.seam),
    panel: read("--panel", fallback.panel),
  }
}

// Applies an alpha to a colour of any CSS form.
//
// This is subtler than it looks, and it was wrong for a whole slice. `getComputedStyle` does not
// hand back the text you wrote in the stylesheet: a token declared as `oklch(0.82 0.14 215)` comes
// back from Chromium as `lab(79.9992% -35.4387 -29.575)`. The first version of this function only
// recognized `oklch(` and `#`, so it silently returned every colour unchanged — and every "tinted"
// fill in the chart (volume bars, RSI bands, the crosshair, supply zones) rendered fully opaque.
//
// So the rule is by *shape*, not by colour space: CSS Color 4 lets any functional notation carry
// `/ <alpha>` before the closing paren, and that covers whatever the browser decides to normalize
// to next. Legacy comma-separated `rgb()` is the one form that cannot, and it becomes `rgba()`.
export function withAlpha(color: string, alpha: number): string {
  const value = color.trim()
  if (value === "") return value

  if (value.startsWith("#")) {
    const hex = value.slice(1)
    const expand = hex.length === 3 || hex.length === 4 ? [...hex].map((c) => c + c).join("") : hex
    if (expand.length !== 6 && expand.length !== 8) return value
    const channels = Number.parseInt(expand.slice(0, 6), 16)
    return `rgba(${(channels >> 16) & 255}, ${(channels >> 8) & 255}, ${channels & 255}, ${alpha})`
  }

  const open = value.indexOf("(")
  if (open === -1 || !value.endsWith(")")) return value
  const fn = value.slice(0, open)
  const args = value.slice(open + 1, -1)

  // Legacy comma syntax has no slash form; rgb/hsl have an -a spelling that does.
  if (args.includes(",")) {
    const parts = args.split(",").map((part) => part.trim())
    if (fn === "rgb" || fn === "rgba") return `rgba(${parts.slice(0, 3).join(", ")}, ${alpha})`
    if (fn === "hsl" || fn === "hsla") return `hsla(${parts.slice(0, 3).join(", ")}, ${alpha})`
    return value
  }

  // Modern space-separated syntax: replace an existing alpha, or append one.
  const base = args.includes("/") ? args.slice(0, args.indexOf("/")).trim() : args.trim()
  return `${fn}(${base} / ${alpha})`
}
