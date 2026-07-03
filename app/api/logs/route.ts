import { NextResponse } from "next/server";
import { getLogs } from "@/lib/store";
import { activeWorkspace } from "@/lib/active";

export async function GET() {
  const ws = await activeWorkspace();
  if (!ws) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  return NextResponse.json(await getLogs(ws.id));
}
