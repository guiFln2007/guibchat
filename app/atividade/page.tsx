"use client";

import { useEffect, useState } from "react";
import type { LogEntry } from "@/lib/types";

export default function Atividade() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const load = () => fetch("/api/logs").then((r) => r.json()).then(setLogs);
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <header className="bg-zinc-900 border-b border-zinc-800 px-8 py-4">
        <h1 className="font-bold text-lg">Atividade</h1>
      </header>

      <div className="p-8 max-w-4xl">
        <p className="text-sm text-zinc-500">
          Cada disparo das suas automações, em tempo real (atualiza a cada 10s)
        </p>

        <div className="mt-6 space-y-2">
          {logs.length === 0 && (
            <p className="text-zinc-500 text-sm bg-zinc-900 border border-dashed border-zinc-700 rounded-xl p-10 text-center">
              Nenhuma atividade ainda. Quando alguém disparar uma automação, aparece aqui. 👀
            </p>
          )}
          {logs.map((l) => (
            <div key={l.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3.5 text-sm flex items-start gap-3 shadow-sm">
              <span>{l.ok ? "✅" : "❌"}</span>
              <div className="min-w-0">
                <p>
                  <strong>{l.fromUsername ? `@${l.fromUsername}` : l.fromId}</strong>{" "}
                  {l.event === "comment" ? "comentou" : l.event === "dm" ? "mandou DM" : "clicou num botão"}
                  {l.text ? <span className="text-zinc-500">: &quot;{l.text}&quot;</span> : null}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {l.automationName}
                  {l.matchedKeyword ? <> · casou com <code className="text-blue-400 bg-blue-950/40 px-1 rounded">{l.matchedKeyword}</code></> : null}
                  {" · "}{l.actions.join(", ") || "nenhuma ação"} · {new Date(l.timestamp).toLocaleString("pt-BR")}
                  {l.error && <span className="text-red-500"> · {l.error}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
