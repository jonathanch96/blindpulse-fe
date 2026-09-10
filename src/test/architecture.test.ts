import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

function filesUnder(directory: string): string[] {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? filesUnder(target) : [target]
  })
}

describe("frontend architecture guards", () => {
  it("keeps server modules out of client-facing feature and app code", () => {
    const roots = [path.resolve("src/app/(app)"), path.resolve("src/features")]
    const violations = roots.flatMap(filesUnder).filter((file) => /from ["']@\/lib\/server\//.test(fs.readFileSync(file, "utf8")))
    expect(violations).toEqual([])
  })

  // The property that matters is not "one file reads it" but "only server code reads it". An
  // allowlist of filenames would have to be edited every time a legitimate server module needs the
  // address, and editing a security guard to make it pass is how a guard stops guarding.
  it("keeps deployment addresses server-only", () => {
    const sourceFiles = filesUnder(path.resolve("src")).filter((file) => /\.[cm]?[jt]sx?$/.test(file) && !file.includes(".test."))
    const addressVars = /\b(BACKEND_BASE_URL|REPLAY_WS_URL)\b/
    const references = sourceFiles.filter((file) => addressVars.test(fs.readFileSync(file, "utf8")))
    expect(references.length).toBeGreaterThan(0)

    const escaped = references.filter((file) => {
      const source = fs.readFileSync(file, "utf8")
      // Under src/lib/server *and* carrying the server-only import: the directory is a convention,
      // the import is what actually fails the build if the module is pulled into a client bundle.
      return !file.includes(`${path.sep}lib${path.sep}server${path.sep}`) || !/^import "server-only"$/m.test(source)
    })
    expect(escaped.map((file) => path.relative(process.cwd(), file))).toEqual([])

    // NEXT_PUBLIC_ is inlined into the client bundle by definition, so an internal address behind
    // that prefix is published whatever else the code does.
    const publicLeaks = sourceFiles.filter((file) => /NEXT_PUBLIC_(BACKEND|REPLAY)/.test(fs.readFileSync(file, "utf8")))
    expect(publicLeaks.map((file) => path.relative(process.cwd(), file))).toEqual([])
  })

  // A <form> defaults to method="get", so a submit landing before React hydrates navigates with
  // every named input in the query string — that is how a password reached the address bar.
  it("never leaves a form on the default GET method", () => {
    const sourceFiles = filesUnder(path.resolve("src")).filter((file) => file.endsWith(".tsx") && !file.includes(".test."))
    const violations = sourceFiles.flatMap((file) => {
      const openingTags = fs.readFileSync(file, "utf8").match(/<form\b[^>]*>/g) ?? []
      return openingTags
        .filter((tag) => !/\bmethod=(?:"post"|{"post"})/.test(tag))
        .map(() => path.relative(process.cwd(), file))
    })
    expect(violations).toEqual([])
  })

  it("declares BFF resource routes explicitly", () => {
    const routeFiles = filesUnder(path.resolve("src/app/api"))
      .filter((file) => file.endsWith("route.ts"))
      .map((file) => path.relative(process.cwd(), file))
    expect(routeFiles.filter((file) => file.includes("[...path]"))).toEqual([])
  })

})
