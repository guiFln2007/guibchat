// Login (POST) e logout (DELETE) do dashboard.
import { NextRequest, NextResponse } from "next/server";
import { authenticate, toPublic } from "@/lib/workspaces";
import { signSession, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const username = String(b.username ?? "");
  const password = String(b.password ?? "");
  if (!username || !password) {
    return NextResponse.json({ error: "usuário e senha obrigatórios" }, { status: 400 });
  }

  const ws = await authenticate(username, password);
  if (!ws) {
    return NextResponse.json({ error: "usuário ou senha inválidos" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, workspace: toPublic(ws) });
  res.cookies.set(SESSION_COOKIE, await signSession(ws.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // local é http
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
