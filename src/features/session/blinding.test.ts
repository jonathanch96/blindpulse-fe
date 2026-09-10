import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// The session slice is a second place a timestamp could sneak into the trader's view, so it gets
// the same guard the feed slice has. The backend already refuses to send one; both layers exist
// because either alone is one refactor away from failing quietly.

function filesUnder(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? filesUnder(target) : [target]
  })
}

describe("session blinding contract", () => {
  it("gives bars an index rather than a timestamp", () => {
    const source = fs.readFileSync(path.resolve("src/features/session/types.ts"), "utf8")
    const bar = /export type SessionBar = \{[\s\S]*?\}/.exec(source)?.[0] ?? ""
    expect(bar).toMatch(/\bindex: number/)
    expect(bar).not.toMatch(/\b(timestamp|openedAt|time)\??:/)
  })

  // startedAt and closedAt describe when the *trader sat down*, which says nothing about when the
  // market data is from. Nothing else here may carry a date.
  it("carries no market date on the session type", () => {
    const source = fs.readFileSync(path.resolve("src/features/session/types.ts"), "utf8")
    const session = /export type ReplaySession = \{[\s\S]*?\n\}/.exec(source)?.[0] ?? ""
    for (const banned of ["windowStart", "windowEnd", "cursorAt", "barAt", "symbol", "instrumentId"]) {
      expect(session).not.toContain(banned)
    }
  })

  it("never formats a calendar date in session components", () => {
    const offenders = filesUnder("src/features/session")
      .filter((file) => /\.tsx?$/.test(file) && !file.includes(".test."))
      .filter((file) => /toLocaleDateString|toLocaleString|date-fns/.test(fs.readFileSync(file, "utf8")))
    expect(offenders).toEqual([])
  })

  // The client must never invent a bound of its own for how far it may read. If it did, and the
  // two disagreed, the quieter one would win silently.
  it("asks the server for the view rather than computing a range", () => {
    const source = fs.readFileSync(path.resolve("src/features/session/api.ts"), "utf8")
    expect(source).toContain("view=true")
    expect(source).not.toMatch(/from=\$\{/)
  })
})
