import { z } from "zod"

import { orderTypes, sides } from "@/features/execution/types"

/**
 * A decimal the server will accept.
 *
 * A string rather than a number all the way through, validated by pattern. Parsing to a float to
 * check it would defeat the reason it is a string: 179.70002 through a float64 is not 179.70002, and
 * this price becomes an account balance.
 */
const decimalString = z
  .string()
  .trim()
  .regex(/^-?\d+(\.\d+)?$/, "must be a decimal number")

const positiveDecimal = decimalString.refine((value) => Number(value) > 0, "must be greater than zero")

/**
 * One order as the trader described it.
 *
 * `quantity` and `riskPct` are alternatives and giving both is refused rather than resolved by
 * precedence — the server refuses it too, and for the same reason: either precedence would silently
 * ignore something the trader typed, and position sizing is the thing this product teaches. The
 * refusal is here as well as there so the ticket can say so without a round trip.
 *
 * `stopLoss` is required and not optional. BR-03 — no entry without a hard stop — is enforced by the
 * server and by a NOT NULL column, and a form that could express a stopless order would be a form
 * whose only purpose was to be rejected.
 */
export const placeOrderSchema = z
  .object({
    clientKey: z.string().min(1).max(100),
    side: z.enum(sides),
    type: z.enum(orderTypes),
    quantity: positiveDecimal.optional(),
    riskPct: positiveDecimal.optional(),
    limitPrice: positiveDecimal.optional(),
    stopLoss: positiveDecimal,
    takeProfit: positiveDecimal.optional(),
  })
  .refine((input) => (input.quantity === undefined) !== (input.riskPct === undefined), {
    message: "Give either a size or a risk percentage, not both",
    path: ["quantity"],
  })
  .refine((input) => input.type === "market" || input.limitPrice !== undefined, {
    message: "A resting order needs the price it waits at",
    path: ["limitPrice"],
  })

// Absent means "leave it", as it does on the server: a dock that sent both levels on every change
// would re-assert a stop the trader had moved to breakeven, and the server validates only what it is
// given precisely so that breakeven is not a one-way door.
export const amendTradeSchema = z
  .object({
    stopLoss: positiveDecimal.optional(),
    takeProfit: positiveDecimal.optional(),
  })
  .refine((input) => input.stopLoss !== undefined || input.takeProfit !== undefined, {
    message: "Name a level to move",
    path: ["stopLoss"],
  })

// A fraction of the position, or nothing at all for the whole of it. Bounded strictly below 1: a
// fraction of exactly 1 is a full close and should be expressed as one, and the server refuses a
// fraction that rounds to everything rather than quietly promoting it.
export const closePositionSchema = z.object({
  fraction: decimalString
    .refine((value) => Number(value) > 0 && Number(value) < 1, "must be between 0 and 1")
    .optional(),
})

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>
export type AmendTradeInput = z.infer<typeof amendTradeSchema>
export type ClosePositionInput = z.infer<typeof closePositionSchema>
