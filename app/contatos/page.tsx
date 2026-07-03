"use client";

import { useEffect, useState } from "react";
import type { Contact } from "@/lib/types";

export default function Contatos() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/contacts").then((r) => r.json()).then(setContacts);
  }, []);

  const filtered = contacts.filter((c) =>
    (c.username ?? c.id).toLowerCase().includes(search.toLowerCase()),
  );

  function ago(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3_600_000);
    if (h < 1) return "há menos de 1 hora";
    if (h < 24) return `há ${h} hora${h > 1 ? "s" : ""}`;
    const d = Math.floor(h / 24);
    return `há ${d} dia${d > 1 ? "s" : ""}`;
  }

  return (
    <div>
      <header className="bg-zinc-900 border-b border-zinc-800 px-8 py-4 flex items-center justify-between">
        <h1 className="font-bold text-lg">Contatos</h1>
        <div className="flex gap-2">
          <button className="border border-zinc-700 bg-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800/40 transition">
            Criar Novo Contato
          </button>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
            Importar
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Painel lateral: segmentos */}
        <div className="w-64 shrink-0 p-6 border-r border-zinc-800 min-h-[calc(100vh-65px)]">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm">Segmentos</h2>
            <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">GRÁTIS</span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Aplicar filtro(s) aos seus contatos para criar o seu primeiro Segmento
          </p>

          <h2 className="font-bold text-sm mt-8 flex justify-between">
            Widgets <span className="text-zinc-400 font-normal text-xs">Contatos</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-2 flex justify-between">
            <span>Comentários em posts</span>
            <span>{contacts.filter((c) => c.source === "comment").length}</span>
          </p>
          <p className="text-xs text-zinc-500 mt-1 flex justify-between">
            <span>Mensagens diretas</span>
            <span>{contacts.filter((c) => c.source === "dm").length}</span>
          </p>
        </div>

        {/* Tabela */}
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button className="text-sm text-zinc-400 flex items-center gap-1.5 hover:text-zinc-100 transition">
                <span>⚲</span> Filtro
              </button>
              <input
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-56"
                placeholder="🔍 Pesquisar"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="text-xs text-zinc-400">do total de {contacts.length}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 px-4 py-2.5 text-[11px] uppercase tracking-wide text-zinc-500 bg-zinc-950 border-b border-zinc-800">
              <span className="col-span-1"></span>
              <span className="col-span-4">Nome</span>
              <span className="col-span-2">Origem</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-3">Última interação</span>
            </div>

            {filtered.length === 0 && (
              <div className="p-12 text-center text-zinc-500 text-sm">
                Nenhum contato ainda. Quando alguém comentar ou mandar DM, aparece aqui automaticamente. 👥
              </div>
            )}

            {filtered.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-12 items-center px-4 py-3 border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/40 transition"
              >
                <div className="col-span-1">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                    {(c.username ?? "?")[0]?.toUpperCase()}
                  </div>
                </div>
                <span className="col-span-4 font-semibold text-sm text-blue-400">
                  {c.username ? `@${c.username}` : c.id}
                </span>
                <span className="col-span-2 text-sm text-zinc-500">
                  {c.source === "comment" ? "💬 Comentário" : "📩 DM"}
                </span>
                <span className="col-span-2">
                  <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded font-medium">
                    Inscrito
                  </span>
                </span>
                <span className="col-span-3 text-sm text-zinc-500">{ago(c.lastInteraction)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
