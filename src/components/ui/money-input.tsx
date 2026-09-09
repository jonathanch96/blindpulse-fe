"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import { digitCount, groupThousands, indexAfterDigitCount, sanitizeMoneyInput } from "@/lib/money"

type InputProps = React.ComponentProps<typeof Input>

// A money amount field that shows thousand separators while typing and sanitizes pasted text (a
// currency symbol, thousand separators, stray whitespace - the kind of thing Excel puts in a
// copied cell) before it ever reaches decimal.js, rather than letting an unparseable string throw
// deep in a live split/payer preview. `value`/`onChange` carry the plain sanitized string (no
// commas) - the same shape every caller already stores in state.
export function MoneyInput({ value, onChange, ...props }: { value: string; onChange: (value: string) => void } & Omit<InputProps, "value" | "onChange">) {
  const ref = React.useRef<HTMLInputElement>(null)
  const pendingCaretDigits = React.useRef<number | null>(null)

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || pendingCaretDigits.current === null) return
    const pos = indexAfterDigitCount(el.value, pendingCaretDigits.current)
    el.setSelectionRange(pos, pos)
    pendingCaretDigits.current = null
  })

  function apply(nextRaw: string, caretDigits: number) {
    pendingCaretDigits.current = caretDigits
    onChange(nextRaw)
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const caret = input.selectionStart ?? input.value.length
    const caretDigits = digitCount(input.value.slice(0, caret))
    apply(sanitizeMoneyInput(input.value), caretDigits)
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const input = event.currentTarget
    const displayed = groupThousands(value)
    const selectionStart = input.selectionStart ?? displayed.length
    const selectionEnd = input.selectionEnd ?? displayed.length
    // `value` (the raw canonical string) has no commas, so the count of digit/dot characters up
    // to a point in the displayed grouped string is also a valid character index into `value`.
    const rawStart = digitCount(displayed.slice(0, selectionStart))
    const rawEnd = digitCount(displayed.slice(0, selectionEnd))
    const pastedRaw = sanitizeMoneyInput(event.clipboardData.getData("text"))
    const merged = sanitizeMoneyInput(value.slice(0, rawStart) + pastedRaw + value.slice(rawEnd))
    apply(merged, rawStart + digitCount(pastedRaw))
  }

  return (
    <Input
      ref={ref}
      inputMode="decimal"
      value={groupThousands(value)}
      onChange={handleChange}
      onPaste={handlePaste}
      {...props}
    />
  )
}
