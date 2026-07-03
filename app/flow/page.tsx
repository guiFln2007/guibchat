"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Automation } from "@/lib/types";

function FlowInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const [a, setA] = useState<Automation | null>(null);

  useEffect(() => {
    fetch("/api/automations")
      .then((r) => r.json())
      .then((list: Automation[]) => setA(list.find((x) => x.id === id) ?? list[0] ?? null));
  }, [id]);

  if (!a) {
    return (
      <div className="flex items-center justify-center h-screen text-zinc-400 text-sm">
        Nenhuma automação. <Link href="/editor" className="text-blue-400 ml-1 hover:underline">Criar uma →</Link>
      </div>
    );
  }

  const enabledSteps = a.steps.filter((s) => s.enabled && s.text);

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/automacoes" className="text-zinc-400 hover:text-zinc-300">Automações</Link>
          <span className="text-zinc-300">›</span>
          <span className="font-bold">{a.name}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ml-2 ${a.active ? "bg-emerald-900/50 text-emerald-300" : "bg-zinc-800 text-zinc-500"}`}>
            {a.active ? "Live" : "Draft"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">✓ Salvo</span>
          <button
            onClick={() => router.push(`/editor?id=${a.id}`)}
            className="border border-zinc-700 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-800/40 transition"
          >
            Ir para Construtor Básico
          </button>
          <button className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-500 transition">
            Publicar
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="flex-1 overflow-auto relative"
        style={{
          backgroundColor: "#09090b",
          backgroundImage: "radial-gradient(circle, #27272a 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <div className="flex items-start gap-16 p-16 min-w-max">
          {/* Nó: Gatilho */}
          <div className="relative">
            <div
              onClick={() => router.push(`/editor?id=${a.id}`)}
              className="w-72 bg-zinc-900 rounded-2xl shadow-lg border border-zinc-800 p-5 cursor-pointer hover:shadow-xl transition"
            >
              <p className="flex items-center gap-2 font-bold text-sm">⚡ Quando...</p>
              <p className="text-xs text-zinc-500 mt-2">
                {a.trigger.type === "comment" ? "alguém comenta" : "alguém manda DM"}
                {a.trigger.postIds ? ` em ${a.trigger.postIds.length} publicação(ões)` : a.trigger.type === "comment" ? " em qualquer publicação" : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.trigger.matchType === "any" ? (
                  <span className="text-[11px] bg-zinc-800 px-2 py-1 rounded-md">qualquer palavra</span>
                ) : (
                  a.trigger.keywords.map((k) => (
                    <span key={k} className="text-[11px] bg-blue-950/40 border border-blue-800 text-blue-300 px-2 py-1 rounded-md font-medium">{k}</span>
                  ))
                )}
              </div>
              {a.publicReplies.filter(Boolean).length > 0 && (
                <div className="mt-3 border-t border-zinc-800/60 pt-2">
                  <p className="text-[10px] uppercase text-zinc-400 font-bold">+ resposta pública rotativa</p>
                  <p className="text-xs text-zinc-500 truncate mt-1">&quot;{a.publicReplies.find(Boolean)}&quot;</p>
                </div>
              )}
              <p className="text-right text-[10px] text-zinc-400 mt-3">Então ●</p>
            </div>
          </div>

          {/* Nós: passos da sequência */}
          {enabledSteps.map((s, i) => (
            <div key={s.id} className="relative flex items-start">
              {/* conector */}
              <svg className="absolute -left-16 top-16 w-16 h-8 text-zinc-400" viewBox="0 0 64 32">
                <path d="M0,16 C24,16 40,16 60,16" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M56,10 L62,16 L56,22" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
              <div
                onClick={() => router.push(`/editor?id=${a.id}`)}
                className="w-72 bg-zinc-900 rounded-2xl shadow-lg border border-zinc-800 p-5 cursor-pointer hover:shadow-xl transition"
              >
                <p className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <span className="w-4 h-4 rounded bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 inline-block" />
                  Instagram · Enviar Mensagem
                </p>
                <p className="font-bold text-sm mt-1.5">
                  {s.kind === "welcome" ? "Boas-vindas" : s.kind === "follow_gate" ? "Follow-gate" : s.kind === "link" ? "Entrega do link 🎯" : "Mensagem"}
                </p>
                <div className="mt-2 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400 whitespace-pre-wrap max-h-28 overflow-hidden">
                  {s.text}
                </div>
                {s.buttons.filter((b) => b.title).map((b, bi) => (
                  <div key={bi} className="mt-1.5 border border-zinc-700 rounded-lg px-3 py-1.5 text-center text-xs text-blue-400 font-medium bg-zinc-900">
                    {b.title} {b.type === "url" ? "🔗" : "→"}
                  </div>
                ))}
                {i < enabledSteps.length - 1 && (
                  <p className="text-right text-[10px] text-zinc-400 mt-3">Próximo Passo ●</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 shadow-sm">
          🖱️ Toque num passo para editar
        </p>
      </div>
    </div>
  );
}

export default function Flow() {
  return (
    <Suspense>
      <FlowInner />
    </Suspense>
  );
}
