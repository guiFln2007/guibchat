// CRUD de automações
import { NextRequest, NextResponse } from "next/server";
import {
  getAutomations,
  addAutomation,
  updateAutomation,
  deleteAutomation,
} from "@/lib/store";
import { activeWorkspace } from "@/lib/active";
import { Automation, DmStep } from "@/lib/types";

export async function GET() {
  const ws = await activeWorkspace();
  if (!ws) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  return NextResponse.json(await getAutomations(ws.id));
}

function sanitizeSteps(steps: unknown): DmStep[] {
  if (!Array.isArray(steps)) return [];
  return steps.map((s, i) => ({
    id: s.id || `s_${i}`,
    kind: s.kind || "custom",
    enabled: !!s.enabled,
    text: s.text || "",
    buttons: Array.isArray(s.buttons)
      ? s.buttons
          .filter((b: { title?: string }) => b?.title?.trim())
          .map((b: { title: string; type?: string; url?: string }) => ({
            title: b.title,
            type: b.type === "url" ? "url" : "next",
            url: b.url || undefined,
          }))
      : [],
  }));
}

export async function POST(req: NextRequest) {
  const ws = await activeWorkspace();
  if (!ws) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const b = await req.json();
  if (!b.name) {
    return NextResponse.json({ error: "name é obrigatório" }, { status: 400 });
  }
  const a: Automation = {
    id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: b.name,
    active: b.active ?? false,
    createdAt: new Date().toISOString(),
    trigger: {
      type: b.trigger?.type === "dm" ? "dm" : "comment",
      postIds: Array.isArray(b.trigger?.postIds) && b.trigger.postIds.length > 0 ? b.trigger.postIds : null,
      matchType: ["exact", "any"].includes(b.trigger?.matchType) ? b.trigger.matchType : "contains",
      keywords: Array.isArray(b.trigger?.keywords) ? b.trigger.keywords : [],
    },
    publicReplies: Array.isArray(b.publicReplies) ? b.publicReplies.filter(Boolean) : [],
    steps: sanitizeSteps(b.steps),
    stats: { triggered: 0, dmsSent: 0, commentsReplied: 0, clicks: 0 },
  };
  await addAutomation(ws.id, a);
  return NextResponse.json(a, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ws = await activeWorkspace();
  if (!ws) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  const patch: Partial<Automation> = { ...b };
  if (b.steps) patch.steps = sanitizeSteps(b.steps);
  const ok = await updateAutomation(ws.id, b.id, patch);
  return NextResponse.json({ ok });
}

export async function DELETE(req: NextRequest) {
  const ws = await activeWorkspace();
  if (!ws) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  await deleteAutomation(ws.id, id);
  return NextResponse.json({ ok: true });
}
