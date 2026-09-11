// The journal model.
//
// The rule this file holds, the same one the drawing module holds: **an entry anchors to a bar
// index, never to a market timestamp**. `createdAt` is here and is a wall-clock instant in the
// trader's own session — when they wrote the note — which says nothing about when the data is from.
// What is absent is any field describing the *bar's* time.

export const emotions = ["calm", "confident", "anxious", "greedy", "fearful", "frustrated", "bored"] as const

export type Emotion = (typeof emotions)[number]

export type JournalEntry = {
  id: string
  sessionId: string
  tradeId: string | null
  /** Where on the chart this belongs. Bounded by the cursor: the server refuses anything past it. */
  barIndex: number
  thesis: string | null
  note: string | null
  emotion: Emotion | null
  conviction: number | null
  tags: string[]
  mediaUrl: string | null
  /** Above 1 means the entry has been edited. The post-mortem says so rather than passing a revised thesis off as the original. */
  version: number
  createdAt: string
  updatedAt: string
}

export type JournalRevision = {
  version: number
  barIndex: number
  thesis: string | null
  note: string | null
  emotion: Emotion | null
  conviction: number | null
  tags: string[]
  supersededAt: string
}

// How each state reads to the trader. The set is closed because the discipline projector counts
// them; free text would make "anxious" and "nervous" two different feelings.
export const emotionLabels: Record<Emotion, string> = {
  calm: "Calm",
  confident: "Confident",
  anxious: "Anxious",
  greedy: "Greedy",
  fearful: "Fearful",
  frustrated: "Frustrated",
  bored: "Bored",
}
