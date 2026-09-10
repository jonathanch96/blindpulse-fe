// The accounts the end-to-end specs create.
//
// One list, imported by both the config (which clears them before the backend starts) and the
// teardown (which clears them after). It was two lists, and adding the mobile spec's account to one
// of them was enough to make them disagree — the run would start clean and finish dirty.
export const testEmails = [
  "playwright-account@example.invalid",
  "playwright-reset@example.invalid",
  "playwright-session@example.invalid",
  "playwright-mobile@example.invalid",
] as const

/** The list as a SQL literal for an IN clause. */
export const testEmailsSql = testEmails.map((email) => `'${email}'`).join(",")
