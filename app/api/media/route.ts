// Lista as publicações da conta logada (pro seletor de posts do editor)
import { NextResponse } from "next/server";
import { igClient } from "@/lib/instagram";
import { activeWorkspace } from "@/lib/active";

export async function GET() {
  const ws = await activeWorkspace();
  if (!ws) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  try {
    const ig = igClient({ token: ws.token, igUserId: ws.igUserId });
    const media = await ig.getMedia(24);
    return NextResponse.json(media);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
