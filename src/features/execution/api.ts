import type { AmendTradeInput, ClosePositionInput, PlaceOrderInput } from "@/features/execution/schema"
import type { Order, RiskState, Trade } from "@/features/execution/types"
import { apiFetch } from "@/lib/api-client"

export async function fetchOrders(sessionId: string): Promise<Order[]> {
  const envelope = await apiFetch<Order[]>(`/api/sessions/${encodeURIComponent(sessionId)}/orders`)
  return envelope.data ?? []
}

export async function fetchTrades(sessionId: string): Promise<Trade[]> {
  const envelope = await apiFetch<Trade[]>(`/api/sessions/${encodeURIComponent(sessionId)}/trades`)
  return envelope.data ?? []
}

export async function fetchPositions(sessionId: string): Promise<Trade[]> {
  const envelope = await apiFetch<Trade[]>(`/api/sessions/${encodeURIComponent(sessionId)}/positions`)
  return envelope.data ?? []
}

export async function fetchRisk(sessionId: string): Promise<RiskState | null> {
  const envelope = await apiFetch<RiskState>(`/api/sessions/${encodeURIComponent(sessionId)}/risk`)
  return envelope.data
}

export async function placeOrder(sessionId: string, input: PlaceOrderInput): Promise<Order | null> {
  const envelope = await apiFetch<Order>(`/api/sessions/${encodeURIComponent(sessionId)}/orders`, {
    method: "POST",
    body: JSON.stringify(input),
  })
  return envelope.data
}

export async function cancelOrder(orderId: string): Promise<void> {
  await apiFetch(`/api/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" })
}

export async function amendTrade(tradeId: string, input: AmendTradeInput): Promise<Trade | null> {
  const envelope = await apiFetch<Trade>(`/api/trades/${encodeURIComponent(tradeId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
  return envelope.data
}

/**
 * Moves the stop to the entry price.
 *
 * Its own endpoint rather than an amend with a computed value, because "moved the stop to entry" and
 * "moved the stop to a price that happens to equal entry" are the same arithmetic and different
 * decisions — and the discipline index wants to recognize the first one by name.
 */
export async function moveStopToBreakeven(tradeId: string): Promise<Trade | null> {
  const envelope = await apiFetch<Trade>(`/api/trades/${encodeURIComponent(tradeId)}/breakeven`, { method: "POST" })
  return envelope.data
}

/**
 * Exits a position, whole or in part.
 *
 * The returned trade is the portion that *closed*, which for a partial is a different row from the
 * one asked about: the caller's position keeps its id and stays open with the remainder. So a caller
 * must not write this response back over the position it closed part of.
 */
export async function closePosition(tradeId: string, input: ClosePositionInput = {}): Promise<Trade | null> {
  const envelope = await apiFetch<Trade>(`/api/trades/${encodeURIComponent(tradeId)}/close`, {
    method: "POST",
    body: JSON.stringify(input),
  })
  return envelope.data
}

export async function closeAllPositions(sessionId: string): Promise<number> {
  const envelope = await apiFetch<{ closed: number }>(
    `/api/sessions/${encodeURIComponent(sessionId)}/positions/close-all`,
    { method: "POST" },
  )
  return envelope.data?.closed ?? 0
}
