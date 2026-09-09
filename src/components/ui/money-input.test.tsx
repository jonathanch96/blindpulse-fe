import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it } from "vitest"

import { MoneyInput } from "@/components/ui/money-input"

function Controlled({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return <MoneyInput aria-label="Amount" value={value} onChange={setValue} />
}

describe("MoneyInput", () => {
  afterEach(cleanup)

  it("displays a stored value with thousand separators", () => {
    render(<Controlled initial="1500000" />)
    expect(screen.getByLabelText("Amount")).toHaveProperty("value", "1,500,000")
  })

  it("groups thousands live as the user types", () => {
    render(<Controlled />)
    const input = screen.getByLabelText("Amount")
    fireEvent.change(input, { target: { value: "1500000" } })
    expect(input).toHaveProperty("value", "1,500,000")
  })

  it("sanitizes a pasted currency symbol instead of storing it raw", () => {
    render(<Controlled />)
    const input = screen.getByLabelText("Amount")
    const clipboardData = { getData: () => "฿65.00" }
    fireEvent.paste(input, { clipboardData })
    expect(input).toHaveProperty("value", "65.00")
  })

  it("sanitizes pasted thousand-separator commas", () => {
    render(<Controlled />)
    const input = screen.getByLabelText("Amount")
    const clipboardData = { getData: () => "$1,234.56" }
    fireEvent.paste(input, { clipboardData })
    expect(input).toHaveProperty("value", "1,234.56")
  })
})
