// Callback do OAuth da Meta: troca o code pelo token e conecta o Instagram à conta.
import { NextRequest, NextResponse } from "next/server";
import { activeWorkspace } from "@/lib/active";
import { exchangeInstagramCode } from "@/lib/instagram";
import { connectInstagram } from "@/lib/workspaces";
import { verifySession } from "@/lib/session";
import { publicBaseUrl } from "@/lib/baseurl";

function back(req: NextRequest, status: string, msg?: string) {
  const url = new URL("/configuracoes", req.url);
  url.searchParams.set("ig", status);
  if (msg) url.searchParams.set("msg", msg);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  if (sp.get("error")) {
    return back(req, "erro", sp.get("error_description") ?? "autorização cancelada");
  }

  const code = sp.get("code");
  const state = sp.get("state");
  const ws = await activeWorkspace();
  const wsIdFromState = await verifySession(state ?? undefined);

  if (!code || !ws || !wsIdFromState || wsIdFromState !== ws.id) {
    return back(req, "erro", "sessão inválida");
  }

  try {
    const redirectUri = `${publicBaseUrl(req)}/api/instagram/callback`;
    const { token, igUserId, username } = await exchangeInstagramCode(code, redirectUri);
    await connectInstagram(ws.id, { igUserId, token, handle: username });
    return back(req, "ok", username);
  } catch (e) {
    console.error("[ig-connect]", e);
    return back(req, "erro", e instanceof Error ? e.message : "falha ao conectar");
  }
}
