import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PositionList } from "@/features/execution/components/position-list"
import type { Trade } from "@/features/execution/types"

afterEach(cleanup)

function position(overrides: Partial<Trade> = {}): Trade {
  return {
    id: "trade-1",
    sessionId: "session-1",
    entryOrderId: "order-1",
    side: "buy",
    quantity: "250",
    entryPrice: "179.70002",
    stopLoss: "179.30000",
    initialStopLoss: "179.30000",
    takeProfit: "180.60000",
    status: "open",
    openedBarIndex: 204,
    openedAt: "2026-09-12T10:00:00Z",
    version: 1,
    ...overrides
  }
}

function renderList(trade: Trade, onAmend = vi.fn()) {
  render(
    <PositionList
      positions={[trade]}
      busyTradeId={null}
      disabled={false}
      onBreakeven={vi.fn()}
      onClose={vi.fn()}
      onAmend={onAmend}
    />,
  )
  return onAmend
}

describe("PositionList level editing", () => {
  /**
   * The bug this exists for, found by driving the real UI.
   *
   * A position whose stop has been moved to breakeven, then edited to change only the target, used to
   * send the *original* stop along with it — because the editor's fields were seeded with useState when
   * the row first mounted and never resynced to the prop. The amend silently reverted the breakeven,
   * undoing the one action the discipline index most wants to reward, with a "Levels moved" toast
   * confirming it.
   */
  it("does not resend a stale stop when only the target is moved", () => {
    // The position as it is *after* a breakeven: the live stop is at the entry, 1R still measured from
    // where it was sized.
    const atBreakeven = position({ stopLoss: "179.70002", initialStopLoss: "179.30000" })
    const onAmend = renderList(atBreakeven)

    fireEvent.click(screen.getByRole("button", { name: /levels/i }))
    // The fields are labelled by adjacent text rather than a for/id pair, so they are found
    // positionally: two inputs appear, stop then target.
    const inputs = screen.getAllByRole("textbox")
    expect(inputs).toHaveLength(2)
    // Seeded from the position as it is now, not as it was when the row mounted.
    expect((inputs[0] as HTMLInputElement).value).toBe("179.70002")

    fireEvent.change(inputs[1], { target: { value: "180.20000" } })
    fireEvent.click(screen.getByRole("button", { name: /^move$/i }))

    expect(onAmend).toHaveBeenCalledTimes(1)
    const [, levels] = onAmend.mock.calls[0]
    expect(levels).toEqual({ takeProfit: "180.20000" })
    // The assertion that matters: no stop is sent at all, so the breakeven stands.
    expect(levels).not.toHaveProperty("stopLoss")
  })

  it("sends only the stop when only the stop is moved", () => {
    const onAmend = renderList(position())
    fireEvent.click(screen.getByRole("button", { name: /levels/i }))
    const inputs = screen.getAllByRole("textbox")
    fireEvent.change(inputs[0], { target: { value: "179.45000" } })
    fireEvent.click(screen.getByRole("button", { name: /^move$/i }))
    expect(onAmend.mock.calls[0][1]).toEqual({ stopLoss: "179.45000" })
  })

  // An editor opened and closed without a change should not produce a request. Sending one would cost a
  // round trip and, worse, re-assert levels the server had already accepted.
  it("sends nothing when the levels are untouched", () => {
    const onAmend = renderList(position())
    fireEvent.click(screen.getByRole("button", { name: /levels/i }))
    fireEvent.click(screen.getByRole("button", { name: /^move$/i }))
    expect(onAmend).not.toHaveBeenCalled()
  })

  // Reopening the editor after the position changed underneath must show the new levels, which is the
  // general form of the breakeven bug: any amend, fill or server-side move makes a cached draft wrong.
  it("reseeds the editor from the position each time it opens", () => {
    const { rerender } = render(
      <PositionList
        positions={[position()]}
        busyTradeId={null}
        disabled={false}
        onBreakeven={vi.fn()}
        onClose={vi.fn()}
        onAmend={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /levels/i }))
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }))

    rerender(
      <PositionList
        positions={[position({ stopLoss: "179.70002" })]}
        busyTradeId={null}
        disabled={false}
        onBreakeven={vi.fn()}
        onClose={vi.fn()}
        onAmend={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /levels/i }))
    expect((screen.getAllByRole("textbox")[0] as HTMLInputElement).value).toBe("179.70002")
  })
})

describe("PositionList readout", () => {
  // 1R is shown beside the live stop because it does not move when the stop does. Without it a position
  // at breakeven looks like one risking nothing, and its R-multiple looks like it came from nowhere.
  it("shows the stop the position was sized on alongside the live one", () => {
    renderList(position({ stopLoss: "179.70002", initialStopLoss: "179.30000" }))
    // "· breakeven" annotates the stop cell; the button of the same name is excluded by asking for
    // the text rather than the role.
    expect(screen.getByText(/179\.70002 · breakeven/)).toBeTruthy()
    expect(screen.getByText("179.30000")).toBeTruthy()
  })

  // Heat is the excursion as a fraction of the position's own stop, which is the reading MAE exists
  // for — and it is why excursions are price distances rather than money.
  it("reports heat as a fraction of the position's own risk", () => {
    renderList(position({ maxAdverseExcursion: "0.20001" }))
    expect(screen.getByText(/0\.50R against/)).toBeTruthy()
  })
})
