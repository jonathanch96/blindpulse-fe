export type AccountRisk = {
  riskPerTradePct: string
  maxDailyDrawdownPct: string
  minRiskReward: string
  maxOpenPositions: number
  leverage: string
}

export type AccountStatus = "active" | "reset" | "archived"

export type Account = {
  id: string
  rootAccountId: string
  parentAccountId: string | null
  iterationIndex: number
  name: string
  strategyProfile: string | null
  currency: string
  initialBalance: string
  currentBalance: string
  currentEquity: string
  peakEquity: string
  netReturnPct: string
  drawdownPct: string
  risk: AccountRisk
  status: AccountStatus
  resetReason: string | null
  resetAt: string | null
  sealedAt: string | null
  rootHash: string | null
  createdAt: string
  updatedAt: string
}

// A tree is one root account and every iteration forked beneath it, oldest first. It is the exact
// shape the Accounts & Resets branch panel renders.
export type AccountTree = {
  rootAccountId: string
  activeAccountId: string | null
  iterations: Account[]
}

export type LedgerEntry = {
  id: string
  sequence: number
  kind: "open" | "trade" | "fee" | "adjustment" | "reset" | "seal"
  referenceType: string | null
  referenceId: string | null
  amount: string
  balanceAfter: string
  equityAfter: string
  previousHash: string | null
  entryHash: string
  recordedAt: string
}

export type LedgerVerification = {
  accountId: string
  entries: number
  rootHash: string
  storedRootHash: string
  valid: boolean
  brokenAtSequence: number | null
}
