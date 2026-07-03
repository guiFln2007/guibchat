// URL pública do app (atrás do proxy do Caddy o origin interno vira localhost:3002).
// Prioridade: APP_BASE_URL (determinístico, casa com o redirect_uri da Meta) →
// cabeçalhos X-Forwarded-* do Caddy → origin.
import type { NextRequest } from "next/server";

export function publicBaseUrl(req: NextRequest): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return host ? `${proto}://${host}` : req.nextUrl.origin;
}
