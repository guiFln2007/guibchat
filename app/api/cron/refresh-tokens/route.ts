// Renovação automática dos tokens de TODAS as contas.
// Protegido por CRON_SECRET. Aceita dois formatos:
//  - query param:  GET /api/cron/refresh-tokens?secret=...   (chamada manual)
//  - header Bearer: Authorization: Bearer <CRON_SECRET>      (Vercel Cron injeta sozinho)
import { NextRequest, NextResponse } from "next/server";
import { getWorkspaces, updateToken } from "@/lib/workspaces";
import { refreshToken } from "@/lib/instagram";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const provided = secret ?? bearer;
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const results: Array<{ handle: string; ok: boolean; error?: string }> = [];
  for (const ws of await getWorkspaces()) {
    try {
      const fresh = await refreshToken(ws.token);
      await updateToken(ws.id, fresh);
      results.push({ handle: ws.handle, ok: true });
    } catch (e) {
      results.push({ handle: ws.handle, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ refreshedAt: new Date().toISOString(), results });
}
