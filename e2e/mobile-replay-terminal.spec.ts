import { expect, test } from "@playwright/test"

// NFR-04 — the replay terminal on a phone.
//
// This file exists because `playwright.config.ts` declared a `mobile-chromium` project matching
// `mobile-*.spec.ts` and no such file existed. The project matched nothing, ran nothing, and
// passed — while the register cited it as the proof that NFR-04 held. A green project name that
// covers nothing is worse than an empty column, because it reads as coverage.
//
// One journey rather than a test per assertion, for the same reason the reset-tree spec is one
// journey: an account may hold only one live replay session, so a per-test setup would either
// re-register the same trader or collide on SESSION_ALREADY_OPEN.
//
// It asserts what is actually built. Pinch-zoom, swipe-up sheets and the toolbar-in-a-drawer from
// the frontend sprint doc §03.7 are **not** implemented, so nothing here claims they are, and the
// register carries NFR-04 as PARTIAL.

const email = "playwright-mobile@example.invalid"
const password = "Playwright!1Pass"

test("a trader can run a replay session on a 390px phone", async ({ page }) => {
  await test.step("register and open an account", async () => {
    await page.goto("/register")
    await page.getByLabel("Name").fill("Playwright Mobile")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: /create account|sign up/i }).click()
    await page.waitForURL("**/accounts")

    await page.getByRole("button", { name: /create sub-account/i }).click()
    await page.getByLabel("Account name").fill("Mobile Desk")
    await page.getByRole("button", { name: "Open account" }).click()
    await expect(page.getByRole("heading", { name: "Mobile Desk" })).toBeVisible()
  })

  await test.step("start a session from the feed catalogue", async () => {
    await page.goto("/feeds")
    await page.getByRole("button", { name: /randomi|start/i }).first().click()
    await page.getByRole("dialog").getByRole("button", { name: /^start session/i }).click()
    await page.waitForURL("**/terminal")
    await expect(page.locator("canvas").first()).toBeVisible()
  })

  // The single most common phone failure, and the cheapest to regress.
  await test.step("the page does not scroll sideways", async () => {
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })

  // The regression this file was written to catch. The terminal is full-bleed and the workspace nav
  // is fixed to the bottom, so before `.mobile-page-bottom` was applied the transport controls sat
  // *underneath* the nav. They were present, and a bounding-box check called them on-screen, and
  // they could not be tapped — which made tap-to-step unreachable on the device NFR-04 is about.
  await test.step("transport controls clear the workspace nav", async () => {
    const stepBox = await page.getByRole("button", { name: /step forward/i }).first().boundingBox()
    const navBox = await page.getByRole("navigation", { name: /workspaces/i }).boundingBox()
    expect(stepBox, "the transport bar should be on screen").not.toBeNull()
    expect(navBox, "the workspace nav should be on screen").not.toBeNull()
    expect(
      stepBox!.y + stepBox!.height,
      "the transport bar overlaps the workspace nav, so a finger cannot reach it",
    ).toBeLessThanOrEqual(navBox!.y)
  })

  await test.step("tap-to-step advances the cursor", async () => {
    // Paused first, so the only thing that can move the cursor is the tap. With the server clock
    // running this would pass whether or not the tap landed.
    await page.getByRole("button", { name: /^pause$/i }).first().tap()
    await page.waitForTimeout(600)

    const barsReleased = async () => {
      const summary = await page.locator('p.sr-only[role="status"]').textContent()
      return Number(summary?.match(/(\d+) bars/)?.[1] ?? 0)
    }
    const before = await barsReleased()
    await page.getByRole("button", { name: /step forward/i }).first().tap()
    await expect.poll(barsReleased, { timeout: 5000 }).toBeGreaterThan(before)
  })

  // The chart is driven by Pointer Events rather than mouse events precisely so one code path
  // serves mouse, touch and pen. This is the assertion that the touch path reaches it.
  //
  // A drag rather than a tap, because the readout is bound to pointer *movement* — §03.7's gesture
  // is "drag crosshair", and a stationary tap produces no readout on a phone. The events are
  // dispatched with pointerType "touch" so this exercises the finger path rather than falling back
  // to Playwright's mouse emulation, which would test a code path a phone never takes.
  await test.step("dragging the chart reads out the bar under the finger", async () => {
    const box = await page.locator("canvas").last().boundingBox()
    expect(box).not.toBeNull()
    const y = box!.y + box!.height * 0.3
    for (const fraction of [0.4, 0.5, 0.6]) {
      await page.dispatchEvent("canvas >> nth=1", "pointermove", {
        pointerType: "touch",
        pointerId: 1,
        isPrimary: true,
        bubbles: true,
        clientX: box!.x + box!.width * fraction,
        clientY: y,
      })
    }
    await expect(page.getByText(/O .* H .* L .* C /).first()).toBeVisible({ timeout: 5000 })
  })

  await test.step("a drawing tool can be selected with a tap", async () => {
    const trendline = page.getByRole("toolbar", { name: /drawing tools/i }).getByRole("button", { name: "Trendline" })
    await trendline.tap()
    await expect(trendline).toHaveAttribute("aria-pressed", "true")
  })

  await test.step("the workspace nav reaches the other screens", async () => {
    await page.getByRole("navigation", { name: /workspaces/i }).getByRole("link", { name: /feeds/i }).tap()
    await page.waitForURL("**/feeds")
  })
})
