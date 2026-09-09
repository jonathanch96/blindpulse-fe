import Decimal from "decimal.js"
import { z } from "zod"

// Decimals cross the wire as strings and stay strings the whole way through the UI. Parsing a
// balance or a risk percentage into a JS number rounds it silently, and a rounded risk limit is a
// limit the server and the screen disagree about.
const decimalString = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^-?\d+(\.\d+)?$/, `${label} must be a number`)

// Compared as a decimal, not a JS number: "0.0000000000000000001" is a real, positive tick size
// on some instruments and rounds to zero the moment it goes through Number().
const positiveDecimal = (label: string) =>
  decimalString(label).refine((value) => new Decimal(value).greaterThan(0), `${label} must be greater than zero`)

export const riskSchema = z.object({
  riskPerTradePct: positiveDecimal("Risk per trade").optional(),
  maxDailyDrawdownPct: positiveDecimal("Max daily drawdown").optional(),
  minRiskReward: positiveDecimal("Minimum R:R").optional(),
  maxOpenPositions: z.number().int().min(1).max(100).optional(),
  leverage: positiveDecimal("Leverage").optional(),
})

export const openAccountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  strategyProfile: z.string().trim().max(160).optional(),
  currency: z.string().trim().length(3, "Use a 3-letter currency code").toUpperCase().optional(),
  initialBalance: positiveDecimal("Starting equity"),
  risk: riskSchema.optional(),
})

export const resetAccountSchema = z.object({
  reason: z.string().trim().min(1, "Say why this iteration is being reset").max(240),
  name: z.string().trim().max(120).optional(),
  strategyProfile: z.string().trim().max(160).optional(),
  initialBalance: positiveDecimal("Starting equity").optional(),
  risk: riskSchema.optional(),
})

export type OpenAccountInput = z.infer<typeof openAccountSchema>
export type ResetAccountInput = z.infer<typeof resetAccountSchema>
