import type { NextRequest } from "next/server"

import { editJournalSchema } from "@/features/journal/schema"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ id: string; jid: string }> }

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id, jid } = await params
  return authenticatedProxy(
    request,
    `/sessions/${encodeURIComponent(id)}/journal/${encodeURIComponent(jid)}`,
    editJournalSchema,
  )
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id, jid } = await params
  return authenticatedProxy(request, `/sessions/${encodeURIComponent(id)}/journal/${encodeURIComponent(jid)}`)
}
