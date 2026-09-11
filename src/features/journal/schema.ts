import { z } from "zod"

import { emotions } from "@/features/journal/types"

const tags = z.array(z.string().trim().max(40)).max(12).optional()

// Mirrors the server's request type, including the part that looks like an oversight: barIndex is
// bounded below at 0 and not above. The real bound is the session's cursor, which only the server
// knows, and a constant here would be a second, quieter answer to the same question.
export const writeJournalSchema = z.object({
  barIndex: z.number().int().min(0),
  tradeId: z.uuid().optional(),
  thesis: z.string().max(4000).optional(),
  note: z.string().max(4000).optional(),
  emotion: z.enum(emotions).optional(),
  conviction: z.number().int().min(1).max(5).optional(),
  tags,
})

// Every field optional, and absent means "leave it" rather than "clear it" — the server draws the
// same distinction, and a form that dropped an unmentioned thesis would lose exactly the content
// the revision history exists to protect. Clearing is an explicit empty string.
export const editJournalSchema = z.object({
  thesis: z.string().max(4000).optional(),
  note: z.string().max(4000).optional(),
  emotion: z.enum(emotions).optional(),
  conviction: z.number().int().min(1).max(5).optional(),
  tags,
})

export type WriteJournalInput = z.infer<typeof writeJournalSchema>
export type EditJournalInput = z.infer<typeof editJournalSchema>
