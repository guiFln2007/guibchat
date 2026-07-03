// Info da conta logada (pra UI: nome, @handle). Nunca expõe token.
import { NextResponse } from "next/server";
import { activeWorkspace } from "@/lib/active";
import { toPublic } from "@/lib/workspaces";

export async function GET() {
  const ws = await activeWorkspace();
  if (!ws) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  // conta só está "conectada" se tiver Instagram real (não placeholder PENDENTE)
  const connected = !!ws.token && ws.token !== "PENDENTE" && !ws.igUserId.startsWith("PENDENTE");
  return NextResponse.json({ ...toPublic(ws), connected });
}
