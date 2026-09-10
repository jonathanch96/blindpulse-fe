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

// Canvas cannot take an oklch() string with an alpha applied after the fact, so tinted fills are
// built by asking the browser to resolve the colour once and re-emitting it with an alpha.
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("oklch(")) {
    return `${color.slice(0, -1)} / ${alpha})`
  }
  if (color.startsWith("#") && color.length === 7) {
    const value = Number.parseInt(color.slice(1), 16)
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
  }
  return color
}
