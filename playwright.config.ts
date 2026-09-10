import path from "node:path"
import { defineConfig, devices } from "@playwright/test"

import { testEmailsSql } from "./e2e/test-users"

const frontendURL = "http://localhost:3100"
const backendURL = "http://localhost:18081"
const backendDirectory = path.resolve(import.meta.dirname, "../blindpulse-be")
const managedServers = process.env.PLAYWRIGHT_EXTERNAL_SERVERS !== "true"


// One command so the whole stack comes up in the order the API needs it: database, migrations, a
// clean slate for the test users, then the service itself on a port that cannot collide with a
// developer's own `make run`.
const backendCommand = [
  "POSTGRES_HOST_PORT=55432 REDIS_HOST_PORT=56379 docker compose up -d --wait postgres redis",
  "PATH=/usr/local/go/bin:$PATH make migrate-up",
  `docker compose exec -T postgres psql -U blindpulse -d blindpulse -c "DELETE FROM blindpulse.users WHERE email IN (${testEmailsSql});"`,
  "APP_PORT=18081 REDIS_ADDR=localhost:56379 KAFKA_BROKERS= PATH=/usr/local/go/bin:$PATH go run ./adapters/rest",
].join(" && ")

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? frontendURL, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", testIgnore: /mobile-.*\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-chromium",
      testMatch: /mobile-.*\.spec\.ts/,
      // The iPhone 13 preset carries browserName "webkit", which quietly made this project need a
      // browser its own name says it does not use. Chromium is pinned after the spread so the
      // project runs what it claims to: the preset is here for the viewport, touch support and
      // device-pixel ratio, not the engine.
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: managedServers
    ? [
        {
          command: backendCommand,
          cwd: backendDirectory,
          url: `${backendURL}/readyz`,
          timeout: 120_000,
          reuseExistingServer: false,
        },
        {
          command: "pnpm dev --port 3100",
          url: frontendURL,
          timeout: 120_000,
          reuseExistingServer: false,
          env: {
            BACKEND_BASE_URL: backendURL,
            NEXTAUTH_URL: frontendURL,
            NEXTAUTH_SECRET: "playwright-nextauth-secret-at-least-32-bytes",
          },
        },
      ]
    : undefined,
  globalTeardown: managedServers ? "./e2e/global-teardown.ts" : undefined,
})
