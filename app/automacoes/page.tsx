"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Automation } from "@/lib/types";

export default function Automacoes() {
  const [list, setList] = useState<Automation[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    fetch("/api/automations").then((r) => r.json()).then(setList);
  }, []);

  useEffect(load, [load]);

  async function toggle(a: Automation) {
    await fetch("/api/automations", {
      method: "PATCH",
      body: JSON.stringify({ id: a.id, active: !a.active }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir essa automação?")) return;
    await fetch(`/api/automations?id=${id}`, { method: "DELETE" });
    load();
  }

  async function clone(a: Automation) {
    await fetch("/api/automations", {
      method: "POST",
      body: JSON.stringify({
        name: `${a.name} (Cópia)`,
        active: false,
        trigger: a.trigger,
        publicReplies: a.publicReplies,
        steps: a.steps,
      }),
    });
    load();
  }

  const filtered = list.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <header className="bg-zinc-900 border-b border-zinc-800 px-8 py-4">
        <h1 className="font-bold text-lg">Automação</h1>
      </header>

      <div className="p-8 max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight">My Automations</h1>
          <Link
            href="/editor"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm"
          >
            + Nova Automação
          </Link>
        </div>

        <input
          className="mt-6 w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 shadow-sm"
          placeholder="🔍 Pesquisar todas as automações..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 px-4 py-2.5 text-[11px] uppercase tracking-wide text-zinc-500 bg-zinc-950 border-b border-zinc-800">
            <span className="col-span-5">Nome</span>
            <span className="col-span-2 text-center">Execuções</span>
            <span className="col-span-2 text-center">DMs / Cliques</span>
            <span className="col-span-3 text-right">Ações</span>
          </div>

          {filtered.length === 0 && (
            <div className="p-12 text-center text-zinc-500 text-sm">
              Nenhuma automação. Clica em <strong>+ Nova Automação</strong> pra criar a primeira! 🚀
            </div>
          )}

          {filtered.map((a) => (
            <div
              key={a.id}
              className="grid grid-cols-12 items-center px-4 py-3.5 border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/40 transition"
            >
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    a.active ? "bg-emerald-900/50 text-emerald-300" : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {a.active ? "Live" : "Stopped"}
                </span>
                <Link href={`/editor?id=${a.id}`} className="truncate font-semibold hover:text-blue-400 transition">
                  {a.name}
                </Link>
              </div>
              <span className="col-span-2 text-center text-sm font-medium">{a.stats?.triggered ?? 0}</span>
              <span className="col-span-2 text-center text-sm text-zinc-500">
                ✉️ {a.stats?.dmsSent ?? 0} · 👆 {a.stats?.clicks ?? 0}
              </span>
              <div className="col-span-3 flex justify-end gap-2">
                <button
                  onClick={() => toggle(a)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                    a.active
                      ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      : "bg-emerald-900/50 text-emerald-300 hover:bg-emerald-200"
                  }`}
                >
                  {a.active ? "Pausar" : "Ativar"}
                </button>
                <Link
                  href={`/editor?id=${a.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 font-medium transition"
                >
                  Editar
                </Link>
                <Link
                  href={`/flow?id=${a.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 font-medium transition"
                >
                  Fluxo
                </Link>
                <button
                  onClick={() => clone(a)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 font-medium transition"
                  title="Clonar automação"
                >
                  Clonar
                </button>
                <button
                  onClick={() => remove(a.id)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-500 hover:bg-red-900/40 hover:text-red-400 transition"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
