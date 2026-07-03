"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { InboxMessage } from "@/lib/types";
import { useMe } from "@/lib/useMe";

interface Conversation {
  contactId: string;
  username?: string;
  lastMessage: string;
  lastTimestamp: string;
  messages: InboxMessage[];
}

export default function CaixaDeEntrada() {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const me = useMe();

  const load = useCallback(() => {
    fetch("/api/inbox").then((r) => r.json()).then(setConvos);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 8_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected, convos]);

  const convo = convos.find((c) => c.contactId === selected);

  async function send() {
    if (!reply.trim() || !selected) return;
    setSending(true);
    setError("");
    const res = await fetch("/api/inbox", {
      method: "POST",
      body: JSON.stringify({ contactId: selected, text: reply }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "erro ao enviar");
    else setReply("");
    setSending(false);
    load();
  }

  function hora(iso: string) {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex h-screen">
      {/* Lista de conversas */}
      <div className="w-80 shrink-0 border-r border-zinc-800 bg-zinc-900 flex flex-col">
        <div className="px-4 py-4 border-b border-zinc-800">
          <h1 className="font-bold text-lg">Caixa de Entrada</h1>
          <div className="flex gap-1.5 mt-3">
            <span className="text-[11px] border border-zinc-700 rounded-full px-2.5 py-1 bg-zinc-950 font-medium">
              Todas ({convos.length})
            </span>
            <span className="text-[11px] border border-zinc-800 rounded-full px-2.5 py-1 text-zinc-400">
              Não lidas
            </span>
            <span className="text-[11px] border border-zinc-800 rounded-full px-2.5 py-1 text-zinc-400">
              Instagram
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {convos.length === 0 && (
            <p className="p-6 text-sm text-zinc-400 text-center">
              Nenhuma conversa ainda. Quando alguém interagir, aparece aqui.
            </p>
          )}
          {convos.map((c) => (
            <button
              key={c.contactId}
              onClick={() => setSelected(c.contactId)}
              className={`w-full text-left px-4 py-3 border-b border-zinc-800/60 transition flex gap-3 ${
                selected === c.contactId ? "bg-blue-950/40" : "hover:bg-zinc-800/40"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {(c.username ?? "?")[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-baseline">
                  <p className="font-semibold text-sm truncate">
                    {c.username ? `@${c.username}` : c.contactId}
                  </p>
                  <span className="text-[10px] text-zinc-400 shrink-0 ml-2">{hora(c.lastTimestamp)}</span>
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5">{c.lastMessage}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversa */}
      <div className="flex-1 flex flex-col bg-zinc-950">
        {!convo ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <p className="text-5xl mb-4">💬</p>
            <p className="font-bold">Este é um espaço para conversar com seus contatos</p>
            <p className="text-sm text-zinc-500 mt-1 max-w-sm">
              Toda mensagem e comentário que você receber será exibido aqui. Selecione uma conversa à esquerda.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                {(convo.username ?? "?")[0]?.toUpperCase()}
              </div>
              <p className="font-bold text-sm">{convo.username ? `@${convo.username}` : convo.contactId}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {convo.messages.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm ${
                    m.direction === "out"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-zinc-900 border border-zinc-800 rounded-bl-sm"
                  }`}>
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    <p className={`text-[10px] mt-1 ${m.direction === "out" ? "text-blue-200" : "text-zinc-400"}`}>
                      {m.via === "bot" ? "🤖 automação · " : m.via === "manual" ? "✍️ você · " : ""}
                      {hora(m.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="bg-zinc-900 border-t border-zinc-800 p-4">
              {error && <p className="text-xs text-red-500 mb-2">⚠️ {error}</p>}
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  placeholder={`Responder pela conta ${me?.handle ? "@" + me.handle : ""}...`}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                />
                <button
                  onClick={send}
                  disabled={sending || !reply.trim()}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-40"
                >
                  {sending ? "..." : "Enviar"}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 mt-2">
                ⓘ A resposta manual usa a janela de 24h da Meta — só funciona se a pessoa interagiu recentemente.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
