import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * The execution slice's half of the NFR-05 / SP4-1 guard.
 *
 * The server refuses to send a bar's instant or anything derived from the daily drawdown boundary, and
 * has its own leak test saying so. This one exists because either layer alone is one refactor away
 * from failing quietly: a type added here to "make the dock a bit more informative" is exactly how a
 * date reaches a trader who is supposed to be reading blind.
 *
 * The boundary is the worse of the two leaks. A single date narrows the window; a visible reset pattern
 * with a two-day gap every five days is a weekend, which rules out crypto outright.
 */

function filesUnder(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? filesUnder(target) : [target]
  })
}

/**
 * Source with comments removed.
 *
 * Necessary, not fastidious: these modules *document* the fields they must never carry, so a naive
 * substring scan matches its own explanation and passes for the wrong reason. An earlier leak test in
 * this repo did exactly that.
 */
function code(file: string): string {
  return fs
    .readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
}

const sourceFiles = filesUnder("src/features/execution").filter(
  (file) => /\.tsx?$/.test(file) && !file.includes(".test."),
)

describe("execution blinding contract", () => {
  it("has sources to check", () => {
    // Without this the whole suite passes vacuously the day someone moves this directory.
    expect(sourceFiles.length).toBeGreaterThan(5)
  })

  // The order type is where a bar instant is most likely to appear, because the server's own order row
  // genuinely has one: placed_bar_at, which the drawdown's market-day boundary is derived from.
  it("gives an order the bar index it was placed on and never the bar's instant", () => {
    const source = code(path.resolve("src/features/execution/types.ts"))
    const order = /export type Order = \{[\s\S]*?\n\}/.exec(source)?.[0] ?? ""
    expect(order).toMatch(/placedBarIndex: number/)
    for (const banned of ["placedBarAt", "barAt", "openedAtBar", "timestamp", "symbol", "instrumentId"]) {
      expect(order).not.toContain(banned)
    }
  })

  // barsHeld is a count, which is the blinded way to express duration: it says how long the trader held
  // in bars they saw, and carries no clue what one bar was worth in minutes of some particular year.
  it("expresses how long a trade was held as a count of bars", () => {
    const source = code(path.resolve("src/features/execution/types.ts"))
    const trade = /export type Trade = \{[\s\S]*?\n\}/.exec(source)?.[0] ?? ""
    expect(trade).toMatch(/barsHeld\?: number/)
    for (const banned of ["closedAt", "barAt", "heldFor", "durationMs", "openedBarAt"]) {
      expect(trade).not.toContain(banned)
    }
  })

  // SP4-1 itself. The risk readout may say how much room is left and must not say when the window
  // turns over — not the instant, not the ordinal of the day, not a countdown, and not the allowance in
  // currency, from which the window could be recovered by division.
  it("carries no daily boundary on the risk readout", () => {
    const source = code(path.resolve("src/features/execution/types.ts"))
    const risk = /export type RiskState = \{[\s\S]*?\n\}/.exec(source)?.[0] ?? ""
    expect(risk).toMatch(/roomRemainingPct: string/)
    for (const banned of [
      "resetAt",
      "dayResetAt",
      "nextReset",
      "dayIndex",
      "dayOrdinal",
      "barsUntilReset",
      "secondsUntil",
      "windowStart",
      "windowEnd",
      "drawdownLimit",
      "allowanceRemaining",
    ]) {
      expect(risk).not.toContain(banned)
    }
  })

  // A component that formatted a date would only have one to format if a date had reached it, so this
  // catches the leak one step before it is visible — and catches a well-meaning "show the reset time"
  // change even if the type it needs has not been added yet.
  it("never formats a calendar date or a countdown anywhere in the slice", () => {
    const offenders = sourceFiles.filter((file) =>
      /toLocaleDateString|toLocaleTimeString|toLocaleString|date-fns|Intl\.DateTimeFormat|formatDistance/.test(
        code(file),
      ),
    )
    expect(offenders).toEqual([])
  })

  // The gate is server-side (BR-04). A client that decided for itself whether an order was allowed
  // would be advice a hand-rolled request walks straight past — and worse, a second answer to the
  // question, which is how the two drift until the quieter one wins.
  it("does not re-implement the gate's decision on the client", () => {
    const sizing = code(path.resolve("src/features/execution/sizing.ts"))
    // The preview may compute what an order risks. It must not hold the account's limits to compare
    // against, because holding them is how it starts deciding.
    for (const banned of ["maxDailyDrawdownPct", "riskPerTradePct", "maxOpenPositions", "minRiskReward", "leverage"]) {
      expect(sizing).not.toContain(banned)
    }
  })
})

describe("execution decimal contract", () => {
  // Every price and amount is a string end to end. The account is computed from these, and a JSON
  // number is a number the parser has already rounded — 179.70002 through a float64 is not 179.70002.
  it("keeps every price and amount a string on the wire types", () => {
    const source = code(path.resolve("src/features/execution/types.ts"))
    const moneyFields = [
      "quantity",
      "stopLoss",
      "initialStopLoss",
      "entryPrice",
      "equity",
      "balance",
      "committedMargin",
      "roomRemainingPct",
    ]
    for (const field of moneyFields) {
      // Matches `field: string` or `field?: string`, and fails on `field: number`.
      expect(source).toMatch(new RegExp(`${field}\\??: string`))
      expect(source).not.toMatch(new RegExp(`${field}\\??: number`))
    }
  })

  // The ticket sends the strings the trader typed. A previewed float going back out as an input is how
  // a rounded number becomes a position size.
  it("submits the typed strings rather than the previewed numbers", () => {
    const ticket = code(path.resolve("src/features/execution/components/order-ticket.tsx"))
    // The submission block reads the state values, not preview.*
    const submitBlock = /function submit\(\) \{[\s\S]*?\n  \}/.exec(ticket)?.[0] ?? ""
    expect(submitBlock).toContain("stopLoss")
    expect(submitBlock).not.toContain("preview.")
  })
})
