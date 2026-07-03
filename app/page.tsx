"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Automation, LogEntry } from "@/lib/types";

const TEMPLATES = [
  {
    emoji: "🔗",
    title: "Enviar links automaticamente por DM a partir dos comentários",
    desc: "Envie um link sempre que alguém comentar em uma publicação ou reel",
    badge: "POPULAR",
  },
  {
    emoji: "💬",
    title: "Responda todas as suas DMs",
    desc: "Envie respostas automaticamente quando alguém te enviar uma DM",
  },
  {
    emoji: "🚀",
    title: "Começar do zero",
    desc: "Monte sua automação personalizada passo a passo",
  },
];

export default function Home() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [name, setName] = useState("");
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    fetch("/api/automations").then((r) => r.json()).then((d) => Array.isArray(d) && setAutomations(d));
    fetch("/api/logs").then((r) => r.json()).then((d) => Array.isArray(d) && setLogs(d));
    fetch("/api/me").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d) {
        setName(d.name);
        setConnected(d.connected);
      }
    });
  }, []);

  const totals = automations.reduce(
    (acc, a) => ({
      triggered: acc.triggered + (a.stats?.triggered ?? 0),
      dms: acc.dms + (a.stats?.dmsSent ?? 0),
      clicks: acc.clicks + (a.stats?.clicks ?? 0),
    }),
    { triggered: 0, dms: 0, clicks: 0 },
  );

  return (
    <div>
      <header className="bg-zinc-900 border-b border-zinc-800 px-8 py-4">
        <h1 className="font-bold text-lg">Inicial</h1>
      </header>

      <div className="p-8 max-w-5xl">
        <h1 className="text-3xl font-extrabold tracking-tight">Olá, {name || "👋"}!</h1>
        <p className="text-sm text-zinc-500 mt-1.5">
          {connected ? "1 canal conectado" : "nenhum canal conectado"} · {automations.length} automações · {logs.length} eventos
        </p>

        <div className="grid grid-cols-3 gap-4 mt-8">
          {[
            { label: "Disparos", value: totals.triggered, icon: "🔥" },
            { label: "DMs enviadas", value: totals.dms, icon: "✉️" },
            { label: "Cliques em botões", value: totals.clicks, icon: "👆" },
          ].map((s) => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <p className="text-2xl">{s.icon}</p>
              <p className="text-3xl font-extrabold mt-2">{s.value}</p>
              <p className="text-sm text-zinc-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-10 mb-4">
          <h2 className="font-bold text-xl">Comece aqui</h2>
          <Link href="/automacoes" className="text-sm text-blue-400 hover:underline">
            Veja todas as automações
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {TEMPLATES.map((t) => (
            <Link
              key={t.title}
              href="/editor"
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:shadow-md hover:border-zinc-600 transition group relative shadow-sm flex flex-col"
            >
              {t.badge && (
                <span className="absolute top-3 right-3 text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded font-bold">
                  {t.badge}
                </span>
              )}
              <p className="font-bold leading-snug pr-8">{t.title}</p>
              <p className="text-xs text-zinc-500 mt-2 flex-1">{t.desc}</p>
              <p className="text-[11px] text-zinc-400 mt-4">⚡ Quick Automation</p>
            </Link>
          ))}
        </div>

        {logs.length > 0 && (
          <>
            <h2 className="font-bold text-xl mt-10 mb-4">Última atividade</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm divide-y divide-zinc-800">
              {logs.slice(0, 5).map((l) => (
                <div key={l.id} className="p-3.5 text-sm flex gap-3">
                  <span>{l.ok ? "✅" : "❌"}</span>
                  <div>
                    <span>
                      <strong>{l.fromUsername ? `@${l.fromUsername}` : l.fromId}</strong>{" "}
                      <span className="text-zinc-500">· {l.text}</span>
                    </span>
                    <span className="text-zinc-400 text-xs ml-2">
                      {new Date(l.timestamp).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
