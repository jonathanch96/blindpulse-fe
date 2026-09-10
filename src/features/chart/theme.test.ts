import { describe, expect, it } from "vitest"

import { withAlpha } from "@/features/chart/theme"

describe("withAlpha", () => {
  // The regression. Tokens are authored as oklch(), but getComputedStyle hands back whatever the
  // browser normalizes to — Chromium returns lab(). The first version of this function matched on
  // "oklch(" and so returned every colour unchanged, which made every tinted fill in the chart
  // fully opaque: volume bars, RSI bands, the crosshair and supply zones all painted solid.
  it("applies alpha to the lab() form the browser actually returns", () => {
    expect(withAlpha("lab(79.9992% -35.4387 -29.575)", 0.18)).toBe("lab(79.9992% -35.4387 -29.575 / 0.18)")
  })

  it.each([
    ["oklch(0.82 0.14 215)", "oklch(0.82 0.14 215 / 0.5)"],
    ["oklab(0.7 0.1 -0.2)", "oklab(0.7 0.1 -0.2 / 0.5)"],
    ["lch(80% 40 200)", "lch(80% 40 200 / 0.5)"],
    ["color(display-p3 0.1 0.2 0.3)", "color(display-p3 0.1 0.2 0.3 / 0.5)"],
    ["rgb(0 210 255)", "rgb(0 210 255 / 0.5)"],
  ])("applies alpha to modern %s", (input, expected) => {
    expect(withAlpha(input, 0.5)).toBe(expected)
  })

  // Legacy comma syntax has no slash form — "rgb(1, 2, 3 / 0.5)" is invalid CSS and canvas would
  // reject it, leaving the previous fillStyle in place.
  it.each([
    ["rgb(0, 210, 255)", "rgba(0, 210, 255, 0.5)"],
    ["rgba(0, 210, 255, 0.9)", "rgba(0, 210, 255, 0.5)"],
    ["hsl(200, 100%, 50%)", "hsla(200, 100%, 50%, 0.5)"],
  ])("converts legacy %s to its -a spelling", (input, expected) => {
    expect(withAlpha(input, 0.5)).toBe(expected)
  })

  it.each([
    ["#00D2FF", "rgba(0, 210, 255, 0.5)"],
    ["#0DF", "rgba(0, 221, 255, 0.5)"],
    ["#00D2FFCC", "rgba(0, 210, 255, 0.5)"],
  ])("converts hex %s", (input, expected) => {
    expect(withAlpha(input, 0.5)).toBe(expected)
  })

  // Replacing rather than appending: a token that already carries an alpha must not end up with
  // two, which is invalid and would fall back to opaque.
  it("replaces an alpha that is already there", () => {
    expect(withAlpha("oklch(0.82 0.14 215 / 0.9)", 0.2)).toBe("oklch(0.82 0.14 215 / 0.2)")
  })

  it.each([["", ""], ["transparent", "transparent"], ["rebeccapurple", "rebeccapurple"], ["#12345", "#12345"]])(
    "leaves %s alone rather than producing something invalid",
    (input, expected) => {
      expect(withAlpha(input, 0.5)).toBe(expected)
    },
  )
})
