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

describe("built client architecture", () => {
  it("requires a real client build with no backend URL leak", () => {
    const clientRoot = path.resolve(".next/static")
    expect(fs.existsSync(clientRoot), "missing .next/static; run pnpm build before the bundle guard").toBe(true)

    const assets = filesUnder(clientRoot).filter((file) => /\.(?:js|json|map)$/.test(file))
    expect(assets.length, "the client build contains no inspectable assets").toBeGreaterThan(0)

    const forbidden = ["BACKEND_BASE_URL", "NEXT_PUBLIC_BACKEND", "http://localhost:8080"]
    const leaks = assets.flatMap((file) => {
      const content = fs.readFileSync(file, "utf8")
      return forbidden.filter((token) => content.includes(token)).map((token) => `${path.relative(process.cwd(), file)} contains ${token}`)
    })
    expect(leaks).toEqual([])
  })
})

