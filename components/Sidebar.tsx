"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const items = [
  { href: "/", label: "Inicial", icon: "🏠" },
  { href: "/contatos", label: "Contatos", icon: "👥" },
  { href: "/automacoes", label: "Automação", icon: "🤖" },
  { href: "/ai", label: "IA", icon: "✨" },
  { href: "/inbox", label: "Caixa de Entrada", icon: "💬" },
  { href: "/atividade", label: "Atividade", icon: "📊" },
  { href: "/configuracoes", label: "Configurações", icon: "⚙️" },
];

interface Me {
  name: string;
  handle: string;
  connected: boolean;
}

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (path === "/login") return;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMe({ name: d.name, handle: d.handle, connected: d.connected }))
      .catch(() => {});
  }, [path]);

  // a tela de login não tem barra lateral
  if (path === "/login") return null;

  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    router.push("/login");
  }

  const initial = (me?.name ?? "G").trim().charAt(0).toUpperCase();

  return (
    <aside className="w-56 shrink-0 bg-black text-white flex flex-col min-h-screen">
      <div className="px-5 py-5">
        <span className="font-extrabold text-xl tracking-tight">MeuChat</span>
      </div>

      <div className="px-5 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 flex items-center justify-center text-xs font-bold">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{me?.name ?? "…"}</p>
            <p className="text-[10px] text-zinc-400">
              {me?.connected ? (
                <>@{me.handle} · <span className="text-emerald-400">●</span> conectado</>
              ) : (
                <><span className="text-amber-400">●</span> sem Instagram</>
              )}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 mt-2">
        {items.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                active
                  ? "bg-zinc-800 text-white font-semibold"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              }`}
            >
              <span className="text-base">{it.icon}</span> {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800 space-y-3">
        <button
          onClick={logout}
          className="w-full text-left text-sm text-zinc-400 hover:text-white transition flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-900"
        >
          <span className="text-base">🚪</span> Sair
        </button>
        <p className="text-[11px] text-zinc-500 px-3">MeuChat · sua ferramenta, suas regras</p>
      </div>
    </aside>
  );
}
