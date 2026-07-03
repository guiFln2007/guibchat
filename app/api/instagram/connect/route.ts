// Inicia o fluxo "Conectar Instagram": redireciona pro OAuth da Meta.
import { NextRequest, NextResponse } from "next/server";
import { activeWorkspace } from "@/lib/active";
import { instagramAuthUrl } from "@/lib/instagram";
import { signSession } from "@/lib/session";
import { publicBaseUrl } from "@/lib/baseurl";

export async function GET(req: NextRequest) {
  const ws = await activeWorkspace();
  if (!ws) return NextResponse.redirect(new URL("/login", req.url));

  const redirectUri = `${publicBaseUrl(req)}/api/instagram/callback`;
  // state assinado: protege contra CSRF e amarra o callback à conta logada
  const state = await signSession(ws.id);
  return NextResponse.redirect(instagramAuthUrl(redirectUri, state));
}
