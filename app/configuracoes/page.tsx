"use client";

import { useEffect, useState } from "react";
import { useMe } from "@/lib/useMe";

const NAV = [
  { section: "Principal", items: ["Geral", "Notificações", "Registros", "Exibir"] },
  { section: "Caixa de Entrada", items: ["Comportamento", "Atribuição automática"] },
  { section: "Canais", items: ["Instagram", "TikTok", "WhatsApp", "Messenger", "Telegram"] },
  { section: "Automação", items: ["Campos", "Tags", "Palavras-chave"] },
];

export default function Configuracoes() {
  const [active, setActive] = useState("Geral");
  const me = useMe();
  const [igResult, setIgResult] = useState<{ status: string; msg: string } | null>(null);

  // ao voltar do OAuth da Meta: /configuracoes?ig=ok|erro&msg=...
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const ig = sp.get("ig");
    if (ig) {
      setIgResult({ status: ig, msg: sp.get("msg") ?? "" });
      setActive("Instagram");
      window.history.replaceState({}, "", "/configuracoes");
    }
  }, []);

  return (
    <div>
      <header className="bg-zinc-900 border-b border-zinc-800 px-8 py-4">
        <h1 className="font-bold text-lg">Configurações</h1>
      </header>

      <div className="flex">
        {/* Nav lateral */}
        <div className="w-60 shrink-0 p-6 border-r border-zinc-800 min-h-[calc(100vh-65px)] space-y-6">
          {NAV.map((g) => (
            <div key={g.section}>
              <h2 className="font-bold text-sm mb-2">{g.section}</h2>
              <div className="space-y-1">
                {g.items.map((it) => (
                  <button
                    key={it}
                    onClick={() => setActive(it)}
                    className={`block text-sm transition ${
                      active === it ? "text-emerald-400 font-semibold" : "text-zinc-500 hover:text-zinc-200"
                    }`}
                  >
                    {it}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 p-8 max-w-3xl">
          {igResult && (
            <div
              className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
                igResult.status === "ok"
                  ? "border-emerald-700 bg-emerald-950/40 text-emerald-300"
                  : "border-red-800 bg-red-950/40 text-red-300"
              }`}
            >
              {igResult.status === "ok"
                ? `✅ Instagram ${igResult.msg ? "@" + igResult.msg + " " : ""}conectado com sucesso!`
                : `❌ Não foi possível conectar${igResult.msg ? ": " + igResult.msg : ""}.`}
            </div>
          )}

          {active === "Geral" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm divide-y divide-zinc-800">
              <Row label="Fuso Horário da Conta" right="Todos os dados são exibidos neste fuso">
                <select className="border border-zinc-700 rounded-lg px-3 py-2 text-sm bg-zinc-900 w-72">
                  <option>(UTC-03:00) - Brasília - São Paulo</option>
                </select>
              </Row>
              <Row label="Conta conectada" right="Conta profissional do Instagram">
                {me?.connected ? (
                  <p className="text-sm font-semibold">@{me.handle} <span className="text-emerald-500 text-xs ml-1">● ativa</span></p>
                ) : (
                  <p className="text-sm text-amber-400 font-medium">Nenhuma conta conectada</p>
                )}
              </Row>
              <Row label="Token de acesso" right="Renovação automática incluída no deploy">
                {me?.connected ? (
                  <p className="text-sm">Long-lived · renovação automática semanal <span className="text-emerald-500 text-xs">● ativa</span></p>
                ) : (
                  <p className="text-sm text-zinc-500">—</p>
                )}
              </Row>
              <Row label="Exportar dados" right="Backup completo das automações e contatos">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-500 transition">
                  Exportar JSON
                </button>
              </Row>
            </div>
          )}

          {active === "Instagram" && me?.connected && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm divide-y divide-zinc-800">
              <Row label="Conta" right="API oficial da Meta (Instagram Login)">
                <p className="text-sm font-semibold">@{me.handle}</p>
              </Row>
              <Row label="Webhook" right="Eventos: comentários, DMs, cliques em botões">
                <p className="text-sm text-emerald-400 font-medium">● Recebendo eventos</p>
              </Row>
              <Row label="Permissões" right="Concedidas no app da Meta">
                <p className="text-xs text-zinc-500">mensagens · comentários · publicação · insights · perfil</p>
              </Row>
            </div>
          )}

          {active === "Instagram" && me && !me.connected && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm p-10 text-center">
              <p className="text-3xl mb-3">📷</p>
              <p className="font-bold">Conecte sua conta do Instagram</p>
              <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">
                Conecte sua conta <strong>profissional</strong> (Comercial ou Criador) do Instagram
                pra ativar suas automações de DM e comentários.
              </p>
              <a
                href="/api/instagram/connect"
                className="inline-flex items-center gap-2 mt-5 bg-gradient-to-r from-amber-500 via-pink-500 to-violet-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition"
              >
                📷 Conectar Instagram
              </a>
            </div>
          )}

          {["TikTok", "WhatsApp", "Messenger", "Telegram"].includes(active) && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm p-10 text-center">
              <p className="text-3xl mb-3">🔌</p>
              <p className="font-bold">{active} — em breve</p>
              <p className="text-sm text-zinc-500 mt-1">
                O MeuChat foi construído pra suportar múltiplos canais. {active} entra na fase 2.
              </p>
            </div>
          )}

          {!["Geral", "Instagram", "TikTok", "WhatsApp", "Messenger", "Telegram"].includes(active) && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm p-10 text-center">
              <p className="text-3xl mb-3">🛠️</p>
              <p className="font-bold">{active}</p>
              <p className="text-sm text-zinc-500 mt-1">Seção em construção.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, right, children }: { label: string; right?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-4 items-center p-5">
      <p className="col-span-3 text-sm font-semibold">{label}</p>
      <div className="col-span-5">{children}</div>
      <p className="col-span-4 text-xs text-zinc-400">{right}</p>
    </div>
  );
}
