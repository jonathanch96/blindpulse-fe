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

  it("keeps the backend URL server-only", () => {
    const sourceFiles = filesUnder(path.resolve("src")).filter((file) => /\.[cm]?[jt]sx?$/.test(file) && !file.includes(".test."))
    const references = sourceFiles.filter((file) => fs.readFileSync(file, "utf8").includes("BACKEND_BASE_URL"))
    expect(references.map((file) => path.relative(process.cwd(), file))).toEqual(["src/lib/server/backend.ts"])

    const publicLeaks = sourceFiles.filter((file) => fs.readFileSync(file, "utf8").includes("NEXT_PUBLIC_BACKEND"))
    expect(publicLeaks).toEqual([])
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
