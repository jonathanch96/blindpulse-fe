import { execFileSync } from "node:child_process"
import path from "node:path"

import { testEmailsSql } from "./test-users"

// Accounts cascade to their ledgers, sessions, orders and trades, so deleting the test users is
// enough to leave the database exactly as the run found it.
const cleanup = `DELETE FROM blindpulse.users WHERE email IN (${testEmailsSql});`

export default function globalTeardown() {
  const cwd = path.resolve(import.meta.dirname, "../../blindpulse-be")
  execFileSync("docker", ["compose", "exec", "-T", "postgres", "psql", "-U", "blindpulse", "-d", "blindpulse", "-c", cleanup], {
    cwd,
    stdio: "inherit",
  })
  execFileSync("docker", ["compose", "stop", "postgres", "redis"], {
    cwd,
    stdio: "inherit",
  })
}
