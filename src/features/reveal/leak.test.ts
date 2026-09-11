import fs from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

// The frontend half of the 05.4 contract. The backend keeps the blinded and disclosed bars as two
// response types so no conditional can turn disclosure on early; this asserts the client did not
// undo that by teaching a blinded module how to hold a ticker or a date.

function read(file: string): string {
  return fs.readFileSync(path.resolve(file), "utf8")
}

// Comments are stripped before the field scan. The blinded modules document what they must not
// carry — "there is no `symbol`, no `instrumentId`" — which is exactly the prose worth keeping and
// exactly what a naive substring search trips over. The rule is about fields, so it reads code.
function code(file: string): string {
  return read(file)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
}

describe("the reveal is quarantined", () => {
  // Every module on the pre-reveal path. If one of these grows a symbol or a window field, a screen
  // that renders a live session is one render away from showing the answer.
  const blindedModules = [
    "src/features/session/types.ts",
    "src/features/feed/types.ts",
    "src/features/drawing/types.ts",
    "src/features/journal/types.ts",
  ]

  it("keeps identity fields out of every blinded module", () => {
    const banned = /\b(symbol|ticker|instrumentId|windowStart|windowEnd|realDate)\b/
    const offenders = blindedModules.filter((file) => banned.test(code(file)))
    expect(offenders).toEqual([])
  })

  // A journal entry anchors to a bar index. createdAt is the trader's own wall clock — when they
  // wrote the note — and is fine; a field describing the *bar's* time is not.
  it("anchors a journal entry to a bar and not to a market instant", () => {
    const source = code("src/features/journal/types.ts")
    expect(source).toContain("barIndex")
    expect(/\bbarTime|barTimestamp|openedAt|candleTime\b/.test(source)).toBe(false)
  })

  // The disclosure must stay reachable only through its own module and its own route. A blinded
  // screen importing it is how the two paths get confused.
  it("confines the reveal types to the reveal feature", () => {
    const featureDirs = fs
      .readdirSync(path.resolve("src/features"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== "reveal")
      .map((entry) => path.resolve("src/features", entry.name))

    const importers: string[] = []
    for (const dir of featureDirs) {
      for (const file of walk(dir)) {
        if (/from ["']@\/features\/reveal\/types["']/.test(code(file))) {
          importers.push(path.relative(process.cwd(), file))
        }
      }
    }
    expect(importers).toEqual([])
  })
})

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}
