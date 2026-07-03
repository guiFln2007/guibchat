"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Automation, DmStep, IgMedia } from "@/lib/types";
import { useMe } from "@/lib/useMe";

function defaultSteps(): DmStep[] {
  return [
    {
      id: "s_welcome",
      kind: "welcome",
      enabled: true,
      text: "Olá! Que bom que você está aqui 😊\n\nClique abaixo e eu te mando o link em um segundo ✨",
      buttons: [{ title: "Me envie o link", type: "next" }],
    },
    {
      id: "s_follow",
      kind: "follow_gate",
      enabled: true,
      text: "Quase lá! Esse link é especial para os meus seguidores\n\nAssim que você me seguir, eu vou enviar o acesso",
      buttons: [{ title: "Seguindo", type: "next" }],
    },
    {
      id: "s_link",
      kind: "link",
      enabled: true,
      text: "Aqui está seu link 👇",
      buttons: [{ title: "Acessar 👉", type: "url", url: "" }],
    },
  ];
}

function blank(): Automation {
  return {
    id: "",
    name: "Minha automação",
    active: false,
    createdAt: "",
    trigger: { type: "comment", postIds: null, matchType: "contains", keywords: [] },
    publicReplies: ["Já está na sua dm!!", "Enviado, cheque sua dm!!"],
    steps: defaultSteps(),
    stats: { triggered: 0, dmsSent: 0, commentsReplied: 0, clicks: 0 },
  };
}

const STEP_LABELS: Record<string, { title: string; desc: string }> = {
  welcome: { title: "uma DM de boas-vindas", desc: "O clique no botão confirma o interesse e abre a janela de 24h" },
  follow_gate: { title: "uma DM pedindo para seguir você", desc: "Verifica DE VERDADE se a pessoa segue — se não seguir, repete a mensagem até seguir 🔒" },
  link: { title: "uma DM contendo o link 🎯", desc: "A mensagem final com o botão de link" },
};

function EditorInner() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");
  const me = useMe();
  const handle = me?.handle ?? "sua conta";

  const [a, setA] = useState<Automation>(blank());
  const [media, setMedia] = useState<IgMedia[]>([]);
  const [mediaError, setMediaError] = useState("");
  const [kwInput, setKwInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState<"comments" | "dm">("comments");
  const [previewMedia, setPreviewMedia] = useState<IgMedia | null>(null);

  useEffect(() => {
    fetch("/api/media")
      .then((r) => r.json())
      .then((d) => (Array.isArray(d) ? setMedia(d) : setMediaError(d.error)))
      .catch((e) => setMediaError(String(e)));
    if (editId) {
      fetch("/api/automations")
        .then((r) => r.json())
        .then((list: Automation[]) => {
          const found = list.find((x) => x.id === editId);
          if (found) setA(found);
        });
    }
  }, [editId]);

  function patch(p: Partial<Automation>) {
    setA((prev) => ({ ...prev, ...p }));
  }
  function patchTrigger(p: Partial<Automation["trigger"]>) {
    setA((prev) => ({ ...prev, trigger: { ...prev.trigger, ...p } }));
  }
  function patchStep(idx: number, p: Partial<DmStep>) {
    setA((prev) => {
      const steps = [...prev.steps];
      steps[idx] = { ...steps[idx], ...p };
      return { ...prev, steps };
    });
  }

  function addKeyword() {
    const k = kwInput.trim();
    if (!k || a.trigger.keywords.includes(k)) return setKwInput("");
    patchTrigger({ keywords: [...a.trigger.keywords, k] });
    setKwInput("");
  }

  function togglePost(id: string) {
    const cur = a.trigger.postIds ?? [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    patchTrigger({ postIds: next.length ? next : null });
  }

  async function save(activate: boolean) {
    setSaving(true);
    const body = { ...a, active: activate };
    if (editId) {
      await fetch("/api/automations", { method: "PATCH", body: JSON.stringify(body) });
    } else {
      await fetch("/api/automations", { method: "POST", body: JSON.stringify(body) });
    }
    setSaving(false);
    router.push("/automacoes");
  }

  const input =
    "w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 shadow-sm";
  const sectionTitle = "font-bold text-base mb-1";

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* ===== Coluna de configuração ===== */}
      <div className="w-[460px] shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col max-h-screen">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <button onClick={() => router.push("/automacoes")} className="text-zinc-400 hover:text-zinc-300 transition">←</button>
          <input
            className="bg-transparent font-bold text-lg focus:outline-none flex-1 min-w-0"
            value={a.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${a.active ? "bg-emerald-900/50 text-emerald-300" : "bg-zinc-800 text-zinc-500"}`}>
            {a.active ? "Live" : "Draft"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-7">
          {/* ---- GATILHO ---- */}
          <section>
            <h2 className={sectionTitle}>Quando alguém...</h2>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(["comment", "dm"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => patchTrigger({ type: t })}
                  className={`px-3 py-2.5 rounded-lg text-sm border-2 font-medium transition ${
                    a.trigger.type === t
                      ? "border-blue-600 bg-blue-950/40 text-blue-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600"
                  }`}
                >
                  {t === "comment" ? "💬 faz um comentário" : "📩 manda uma DM"}
                </button>
              ))}
            </div>

            {a.trigger.type === "comment" && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-zinc-400 mb-2">Em qual publicação ou Reels?</p>
                <button
                  onClick={() => patchTrigger({ postIds: null })}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium mb-2 transition ${
                    !a.trigger.postIds
                      ? "border-blue-600 bg-blue-950/40 text-blue-300"
                      : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                  }`}
                >
                  {!a.trigger.postIds ? "✓ Qualquer publicação ou Reel" : "Qualquer publicação ou Reel"}
                </button>
                {a.trigger.postIds && (
                  <span className="text-xs text-blue-400 font-medium ml-2">
                    {a.trigger.postIds.length} selecionada(s)
                  </span>
                )}
                {mediaError && (
                  <p className="text-xs text-red-500">Erro ao carregar posts: {mediaError}</p>
                )}
                <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto rounded-lg mt-1">
                  {media.map((m) => {
                    const sel = a.trigger.postIds?.includes(m.id);
                    const src = m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setPreviewMedia(m)}
                        className={`relative aspect-square rounded-md overflow-hidden border-2 transition ${
                          sel ? "border-blue-600" : "border-transparent opacity-85 hover:opacity-100"
                        }`}
                        title="Clique para ver o preview"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        {m.media_type === "VIDEO" && (
                          <span className="absolute bottom-1 left-1 text-white text-[10px] drop-shadow">▶</span>
                        )}
                        {sel && (
                          <span className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4">
              <p className="text-xs font-semibold text-zinc-400 mb-2">
                E {a.trigger.type === "comment" ? "esse comentário" : "essa DM"} possui:
              </p>
              <div className="flex gap-2 mb-2">
                {([
                  ["contains", "palavras específicas"],
                  ["exact", "texto exato"],
                  ["any", "qualquer palavra"],
                ] as const).map(([v, lbl]) => (
                  <button
                    key={v}
                    onClick={() => patchTrigger({ matchType: v })}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${
                      a.trigger.matchType === v
                        ? "border-blue-600 bg-blue-950/40 text-blue-300"
                        : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              {a.trigger.matchType !== "any" && (
                <>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {a.trigger.keywords.map((k) => (
                      <span key={k} className="bg-blue-950/40 border border-blue-800 text-blue-300 text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1.5">
                        {k}
                        <button
                          onClick={() => patchTrigger({ keywords: a.trigger.keywords.filter((x) => x !== k) })}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    className={input}
                    placeholder="Digite uma ou mais palavras"
                    value={kwInput}
                    onChange={(e) => setKwInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                    onBlur={addKeyword}
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Aperte Enter para incluir cada palavra-chave. Por exemplo:{" "}
                    <button onClick={() => patchTrigger({ keywords: [...new Set([...a.trigger.keywords, "Preço"])] })} className="border border-zinc-700 rounded px-1.5 hover:bg-zinc-800">Preço</button>{" "}
                    <button onClick={() => patchTrigger({ keywords: [...new Set([...a.trigger.keywords, "Link"])] })} className="border border-zinc-700 rounded px-1.5 hover:bg-zinc-800">Link</button>{" "}
                    <button onClick={() => patchTrigger({ keywords: [...new Set([...a.trigger.keywords, "Comprar"])] })} className="border border-zinc-700 rounded px-1.5 hover:bg-zinc-800">Comprar</button>
                  </p>
                </>
              )}
            </div>
          </section>

          {/* ---- RESPOSTAS PÚBLICAS ---- */}
          {a.trigger.type === "comment" && (
            <section>
              <h2 className={sectionTitle}>Em seguida</h2>
              <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/60">
                <p className="text-sm font-semibold">interagir com os comentários deles na publicação</p>
                <p className="text-[11px] text-zinc-500 mb-3">
                  Variações rotativas — cada resposta é sorteada pra não parecer robô. Deixe tudo vazio pra não responder.
                </p>
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      className={input}
                      placeholder={`Variação ${i + 1}`}
                      value={a.publicReplies[i] ?? ""}
                      onChange={(e) => {
                        const r = [...a.publicReplies];
                        r[i] = e.target.value;
                        patch({ publicReplies: r });
                      }}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ---- SEQUÊNCIA DE DMs ---- */}
          <section>
            <h2 className={sectionTitle}>Eles receberão</h2>
            <div className="space-y-3 mt-2">
              {a.steps.map((s, idx) => (
                <div
                  key={s.id}
                  className={`border rounded-xl p-4 transition ${
                    s.enabled ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-800 bg-zinc-900 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold">{STEP_LABELS[s.kind]?.title ?? "uma mensagem"}</p>
                    <button
                      onClick={() => patchStep(idx, { enabled: !s.enabled })}
                      className={`w-10 h-5 rounded-full relative transition ${s.enabled ? "bg-blue-600" : "bg-zinc-300"}`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-zinc-900 shadow transition-all ${s.enabled ? "left-5" : "left-0.5"}`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-500 mb-2">{STEP_LABELS[s.kind]?.desc}</p>
                  {s.enabled && (
                    <>
                      <textarea
                        className={input}
                        rows={3}
                        value={s.text}
                        onChange={(e) => patchStep(idx, { text: e.target.value })}
                      />
                      {s.buttons.map((b, bi) => (
                        <div key={bi} className="flex gap-2 mt-2">
                          <input
                            className={input}
                            placeholder="Texto do botão"
                            maxLength={20}
                            value={b.title}
                            onChange={(e) => {
                              const buttons = [...s.buttons];
                              buttons[bi] = { ...b, title: e.target.value };
                              patchStep(idx, { buttons });
                            }}
                          />
                          {b.type === "url" && (
                            <input
                              className={input}
                              placeholder="https://seulink.com"
                              value={b.url ?? ""}
                              onChange={(e) => {
                                const buttons = [...s.buttons];
                                buttons[bi] = { ...b, url: e.target.value };
                                patchStep(idx, { buttons });
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ---- Rodapé com ações ---- */}
        <div className="p-4 border-t border-zinc-800 flex gap-2 bg-zinc-900">
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition disabled:opacity-40"
          >
            Salvar rascunho
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving || (a.trigger.matchType !== "any" && a.trigger.keywords.length === 0)}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-40 shadow-sm"
          >
            {saving ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </div>

      {/* ===== Preview do celular ===== */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-[300px] h-[600px] bg-black border-[6px] border-zinc-900 rounded-[36px] overflow-hidden flex flex-col shadow-2xl">
          <div className="text-center text-[10px] text-zinc-500 py-2 border-b border-zinc-900 uppercase tracking-widest">
            {handle} · {previewTab === "comments" ? "Comentários" : "Mensagens"}
          </div>

          {previewTab === "comments" ? (
            <div className="flex-1 p-3 space-y-3 text-[12px] overflow-y-auto">
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-zinc-700 shrink-0" />
                <div>
                  <p className="text-zinc-400 text-[10px]">usuario · agora</p>
                  <p className="text-zinc-200">
                    {a.trigger.matchType === "any" ? "qualquer comentário" : (a.trigger.keywords[0] ?? "QUERO")}
                  </p>
                </div>
              </div>
              {a.publicReplies.filter(Boolean).length > 0 && (
                <div className="flex gap-2 pl-6">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 shrink-0" />
                  <div>
                    <p className="text-zinc-400 text-[10px]">{handle} · agora</p>
                    <p className="text-zinc-200">{a.publicReplies.find(Boolean)}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 p-3 space-y-3 text-[12px] overflow-y-auto">
              {a.steps.filter((s) => s.enabled && s.text).map((s) => (
                <div key={s.id} className="max-w-[85%]">
                  <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-3 py-2 text-zinc-100 whitespace-pre-wrap">
                    {s.text}
                  </div>
                  {s.buttons.filter((b) => b.title).map((b, i) => (
                    <div
                      key={i}
                      className="mt-1 border border-zinc-700 rounded-xl px-3 py-2 text-center text-blue-400 bg-zinc-900"
                    >
                      {b.title}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div className="flex border-t border-zinc-900">
            {([["comments", "💬 Comentários"], ["dm", "📩 DM"]] as const).map(([v, lbl]) => (
              <button
                key={v}
                onClick={() => setPreviewTab(v)}
                className={`flex-1 py-2.5 text-[11px] transition ${
                  previewTab === v ? "text-blue-400 font-bold" : "text-zinc-500"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-zinc-400 mt-4">
          ⓘ A prévia exibe como essa automação aparecerá para o seu público no Instagram
        </p>
      </div>

      {/* ===== Modal de preview do post/vídeo ===== */}
      {previewMedia && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <p className="text-sm font-bold">
                {previewMedia.media_type === "VIDEO" ? "🎬 Preview do Reel" : "🖼️ Preview do post"}
              </p>
              <button
                onClick={() => setPreviewMedia(null)}
                className="text-zinc-400 hover:text-zinc-100 transition text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="bg-black flex items-center justify-center max-h-[55vh]">
              {previewMedia.media_type === "VIDEO" ? (
                <video
                  src={previewMedia.media_url}
                  poster={previewMedia.thumbnail_url}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="max-h-[55vh] w-auto"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewMedia.media_url}
                  alt=""
                  className="max-h-[55vh] w-auto object-contain"
                />
              )}
            </div>

            {previewMedia.caption && (
              <p className="px-4 py-3 text-xs text-zinc-400 max-h-20 overflow-y-auto border-b border-zinc-800">
                {previewMedia.caption}
              </p>
            )}

            <div className="p-4 flex items-center gap-2">
              {a.trigger.postIds?.includes(previewMedia.id) ? (
                <button
                  onClick={() => { togglePost(previewMedia.id); setPreviewMedia(null); }}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                >
                  ✕ Remover da automação
                </button>
              ) : (
                <button
                  onClick={() => { togglePost(previewMedia.id); setPreviewMedia(null); }}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition"
                >
                  ✓ É esse! Usar nesse post
                </button>
              )}
              {previewMedia.permalink && (
                <a
                  href={previewMedia.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                >
                  Abrir no IG ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Editor() {
  return (
    <Suspense>
      <EditorInner />
    </Suspense>
  );
}
