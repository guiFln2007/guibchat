// Porteiro do dashboard: exige sessão válida em tudo, menos rotas públicas.
// Roda no edge — usa só lib/session (Web Crypto), nunca node:crypto.
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Rotas públicas (sem login): webhook da Meta, política de privacidade, a própria tela de login.
const PUBLIC_PREFIXES = ["/api/webhook", "/privacy", "/login", "/api/login", "/api/cron"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const wsId = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (wsId) return NextResponse.next();

  // API → 401 JSON; páginas → redireciona pro login
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // tudo, exceto assets estáticos do Next e arquivos com extensão
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
