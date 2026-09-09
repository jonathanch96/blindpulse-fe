const DEFAULT_SITE_URL = "http://localhost:3000"

export const SITE_NAME = "BlindPulse Replay Lab"

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "")

export const SITE_TAGLINE = "Trade the Chart, Not the Hindsight"

export const SITE_DESCRIPTION =
  "Replay real historical markets with the ticker, the date, and the news masked — then unblind the session and see what your discipline was actually worth."
