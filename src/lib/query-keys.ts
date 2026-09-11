export const qk = {
  all: ["blindpulse"] as const,
  // The signed-in user's own profile. Mutated by the settings screen, and invalidated after setting
  // a first password because has_password is what decides which form that card shows.
  currentUser: () => [...qk.all, "user", "me"] as const,
  accounts: () => [...qk.all, "accounts"] as const,
  account: (accountId: string) => [...qk.accounts(), accountId] as const,
  accountTree: (accountId: string) => [...qk.account(accountId), "tree"] as const,
  accountLedger: (accountId: string) => [...qk.account(accountId), "ledger"] as const,
  sessions: () => [...qk.all, "sessions"] as const,
  // Finished sessions are keyed apart from live ones: they answer different questions and a
  // shared key would make closing a session silently empty the terminal's list.
  finishedSessions: () => [...qk.sessions(), "history"] as const,
  session: (sessionId: string) => [...qk.sessions(), sessionId] as const,
  // Bars are keyed by the cursor as well as the session: a replay frame is only valid for the
  // bar index it was fetched at, so a stale window must never be served from cache after a step.
  sessionBars: (sessionId: string, cursor: number) => [...qk.session(sessionId), "bars", cursor] as const,
  // The rolled-up view is keyed by timeframe but not by the cursor: during playback the stream
  // mutates this entry in place, and a key that moved with the edge would refetch the whole window
  // for every bar released.
  sessionView: (sessionId: string, timeframe: string) => [...qk.session(sessionId), "view", timeframe] as const,
  sessionOrders: (sessionId: string) => [...qk.session(sessionId), "orders"] as const,
  sessionTrades: (sessionId: string) => [...qk.session(sessionId), "trades"] as const,
  sessionPositions: (sessionId: string) => [...qk.session(sessionId), "positions"] as const,
  sessionDrawings: (sessionId: string) => [...qk.session(sessionId), "drawings"] as const,
  sessionMetrics: (sessionId: string) => [...qk.session(sessionId), "metrics"] as const,
  sessionReveal: (sessionId: string) => [...qk.session(sessionId), "reveal"] as const,
  journal: (sessionId: string) => [...qk.session(sessionId), "journal"] as const,
  journalRevisions: (sessionId: string, entryId: string) =>
    [...qk.journal(sessionId), entryId, "revisions"] as const,
  // The disclosed series is keyed apart from the blinded window on purpose: they are different
  // data about the same session, and one cache entry for both is how a blinded screen ends up
  // rendering unblinded bars.
  sessionDisclosure: (sessionId: string) => [...qk.session(sessionId), "disclosure"] as const,
  feeds: () => [...qk.all, "feeds"] as const,
  analytics: (scope: string) => [...qk.all, "analytics", scope] as const,
}
