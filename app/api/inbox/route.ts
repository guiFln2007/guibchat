// Caixa de Entrada: GET = conversas agrupadas · POST = responder DM
import { NextRequest, NextResponse } from "next/server";
import { getInbox, addInboxMessage, getContacts } from "@/lib/store";
import { igClient } from "@/lib/instagram";
import { activeWorkspace } from "@/lib/active";

export async function GET() {
  const ws = await activeWorkspace();
  if (!ws) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const [messages, contacts] = await Promise.all([getInbox(ws.id), getContacts(ws.id)]);
  const byContact = new Map<string, typeof messages>();
  for (const m of messages) {
    if (!byContact.has(m.contactId)) byContact.set(m.contactId, []);
    byContact.get(m.contactId)!.push(m);
  }
  const conversations = Array.from(byContact.entries()).map(([contactId, msgs]) => {
    const contact = contacts.find((c) => c.id === contactId);
    const last = msgs[msgs.length - 1];
    return {
      contactId,
      username: contact?.username ?? msgs.find((m) => m.contactUsername)?.contactUsername,
      lastMessage: last.text,
      lastTimestamp: last.timestamp,
      messages: msgs,
    };
  });
  conversations.sort((a, b) => b.lastTimestamp.localeCompare(a.lastTimestamp));
  return NextResponse.json(conversations);
}

export async function POST(req: NextRequest) {
  const ws = await activeWorkspace();
  if (!ws) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const b = await req.json();
  if (!b.contactId || !b.text) {
    return NextResponse.json({ error: "contactId e text obrigatórios" }, { status: 400 });
  }
  try {
    const ig = igClient({ token: ws.token, igUserId: ws.igUserId });
    await ig.sendDm(b.contactId, b.text);
    await addInboxMessage(ws.id, {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      contactId: b.contactId,
      direction: "out",
      text: b.text,
      timestamp: new Date().toISOString(),
      via: "manual",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
