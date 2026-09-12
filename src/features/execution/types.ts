/**
 * The execution wire types.
 *
 * What is absent is deliberate and mirrors the server (NFR-05, SP4-1). An order carries the bar
 * *index* it was placed on and never the bar's instant; a trade reports how long it was held as a
 * count of bars rather than a duration; the risk readout says how much of the daily allowance is
 * left and nothing about when that allowance resets. A reset pattern with a two-day gap every five
 * days is a weekend, which rules out crypto outright and narrows everything else — so the boundary
 * never crosses the wire, and `leak.test.ts` is what keeps that true as these types grow.
 *
 * Every price and every amount is a string. The account is computed from these, and a JSON number
 * is a number the parser has already rounded.
 */

export const sides = ["buy", "sell"] as const
export type Side = (typeof sides)[number]

export const orderTypes = ["market", "limit", "stop"] as const
export type OrderType = (typeof orderTypes)[number]

export type OrderStatus = "pending" | "filled" | "cancelled" | "rejected" | "expired"

export type ExitReason = "stop" | "target" | "manual" | "session_end" | "drawdown_halt"

export type Order = {
  id: string
  sessionId: string
  clientKey: string
  side: Side
  type: OrderType
  quantity: string
  limitPrice?: string
  stopLoss: string
  takeProfit?: string
  riskReward?: string
  /** What this order puts at risk in account currency — the number the gate measured. */
  riskAmount?: string
  status: OrderStatus
  /** The rule that refused it (BR-09). A rejected order is a row, not a non-event. */
  rejectionCode?: string
  placedBarIndex: number
  filledBarIndex?: number
  filledPrice?: string
  slippage: string
  /** When the trader acted, in their own clock. Not when the bar is from. */
  createdAt: string
  version: number
}

export type Trade = {
  id: string
  sessionId: string
  entryOrderId: string
  side: Side
  quantity: string
  entryPrice: string
  exitPrice?: string
  stopLoss: string
  /** What 1R was measured against. It does not move when the stop does. */
  initialStopLoss: string
  takeProfit?: string
  status: "open" | "closed"
  exitReason?: ExitReason
  behaviorTag?: string
  realizedPnl?: string
  rMultiple?: string
  /** Non-negative price distances, in the same units as the stop. */
  maxAdverseExcursion?: string
  maxFavorableExcursion?: string
  openedBarIndex: number
  closedBarIndex?: number
  barsHeld?: number
  openedAt: string
  version: number
}

export type RiskState = {
  halted: boolean
  /** 0–100. A fraction of the allowance, never a distance in currency and never a time. */
  roomRemainingPct: string
  openPositions: number
  balance: string
  equity: string
  committedMargin: string
}

/**
 * The gate's refusal codes, with what each one means to a trader.
 *
 * Kept here rather than built from the code string because the server's codes are terse by design —
 * `RISK_STOP_TOO_WIDE` is a machine-readable fact, not a sentence — and the dock has to tell someone
 * mid-decision what to change. The server sends a message too; this is the short form the ticket
 * shows inline, beside the field at fault.
 */
export const rejectionReasons: Record<string, string> = {
  SESSION_CLOSED: "This session has ended.",
  ORDER_STOP_REQUIRED: "Every entry needs a stop.",
  ORDER_STOP_INVALID: "The stop is on the wrong side of the entry.",
  ORDER_TARGET_INVALID: "The target is on the wrong side of the entry.",
  ORDER_QUANTITY_INVALID: "That size is not a tradeable quantity.",
  RISK_STOP_TOO_WIDE: "This risks more than your per-trade limit. Tighten the stop or cut the size.",
  RISK_REWARD_TOO_LOW: "The reward does not clear your minimum for the risk taken.",
  MAX_POSITIONS_REACHED: "You are already at your open-position limit.",
  INSUFFICIENT_MARGIN: "Your equity will not fund this on top of what is already open.",
  DAILY_DRAWDOWN_BREACHED: "The daily drawdown gate is closed. No new positions.",
  DUPLICATE_ORDER: "That order was already submitted.",
}
