import { expect, test } from "@playwright/test"

const email = "playwright-reset@example.invalid"
const password = "Playwright!1Pass"

// The reset tree is the product's central claim: destroying an account must not destroy its
// history. That is not something a unit test can assert end to end, because it spans the browser,
// the BFF, the Go domain and the hash chain in PostgreSQL.
test("a reset seals the previous iteration and keeps it visible", async ({ page }) => {
  await page.goto("/register")
  await page.getByLabel("Name").fill("Playwright Reset")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: /create account|sign up/i }).click()
  await page.waitForURL("**/accounts")

  await page.getByRole("button", { name: /create sub-account/i }).click()
  await page.getByLabel("Account name").fill("Swing Replay")
  await page.getByLabel("Strategy profile").fill("Liquidity Sweep")
  await page.getByRole("button", { name: "Open account" }).click()

  await expect(page.getByRole("heading", { name: "Swing Replay" })).toBeVisible()
  await expect(page.getByText("Active fork")).toBeVisible()

  await page.getByRole("button", { name: /reset active balance/i }).click()
  await page.getByLabel("Why are you resetting?").fill("Max drawdown breached")
  await page.getByRole("button", { name: /seal and fork/i }).click()

  // Both iterations coexist: the sealed one is still listed, and its integrity still verifies.
  await expect(page.getByText("Iteration #01: Swing Replay")).toBeVisible()
  await expect(page.getByText(/Iteration #02/)).toBeVisible()
  await expect(page.getByText("Verified")).toBeVisible()
})
