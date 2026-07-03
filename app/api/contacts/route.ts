import { NextResponse } from "next/server";
import { getContacts } from "@/lib/store";
import { activeWorkspace } from "@/lib/active";

export async function GET() {
  const ws = await activeWorkspace();
  if (!ws) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const contacts = await getContacts(ws.id);
  // mais recentes primeiro
  contacts.sort((a, b) => b.lastInteraction.localeCompare(a.lastInteraction));
  return NextResponse.json(contacts);
}
