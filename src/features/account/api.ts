import { apiFetch } from "@/lib/api-client"
import type { Account, AccountTree, LedgerEntry, LedgerVerification } from "@/features/account/types"
import type { OpenAccountInput, ResetAccountInput } from "@/features/account/schema"

export async function fetchAccountTrees(): Promise<AccountTree[]> {
  const envelope = await apiFetch<AccountTree[]>("/api/accounts")
  return envelope.data ?? []
}

export async function fetchAccountTree(accountId: string): Promise<AccountTree | null> {
  const envelope = await apiFetch<AccountTree>(`/api/accounts/${encodeURIComponent(accountId)}/tree`)
  return envelope.data
}

export async function openAccount(input: OpenAccountInput): Promise<Account | null> {
  const envelope = await apiFetch<Account>("/api/accounts", { method: "POST", body: JSON.stringify(input) })
  return envelope.data
}

export async function resetAccount(accountId: string, input: ResetAccountInput): Promise<Account | null> {
  const envelope = await apiFetch<Account>(`/api/accounts/${encodeURIComponent(accountId)}/reset`, {
    method: "POST",
    body: JSON.stringify(input),
  })
  return envelope.data
}

export async function fetchLedger(accountId: string): Promise<LedgerEntry[]> {
  const envelope = await apiFetch<LedgerEntry[]>(`/api/accounts/${encodeURIComponent(accountId)}/ledger`)
  return envelope.data ?? []
}

// Backs the "CRYPTOGRAPHIC INTEGRITY — VERIFIED" badge. It is a live recomputation of the chain,
// not a stored flag, so the badge means something.
export async function verifyLedger(accountId: string): Promise<LedgerVerification | null> {
  const envelope = await apiFetch<LedgerVerification>(`/api/accounts/${encodeURIComponent(accountId)}/ledger/verify`)
  return envelope.data
}
