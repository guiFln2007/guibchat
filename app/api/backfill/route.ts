// Backfill: processa comentários ANTIGOS de um vídeo (de antes da automação existir)
// e dispara o fluxo pra cada pessoa, com delay entre cada uma (anti-spam).
import { NextRequest, NextResponse } from "next/server";
import { getAutomations, getInbox } from "@/lib/store";
import { handleComment, ctxFor } from "@/lib/engine";
import { activeWorkspace } from "@/lib/active";

const GRAPH = "https://graph.instagram.com/v23.0";

interface RawComment {
  id: string;
  text?: string;
  timestamp?: string;
  from?: { id?: string; username?: string };
  username?: string;
}

// estado do backfill em andamento (1 por vez)
let running = false;
let progress = { total: 0, done: 0, skipped: 0, errors: 0, finished: true };

export async function GET() {
  return NextResponse.json({ running, ...progress });
}

export async function POST(req: NextRequest) {
  const ws = await activeWorkspace();
  if (!ws) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (running) {
    return NextResponse.json({ error: "Já tem um backfill rodando", ...progress }, { status: 409 });
  }

  const TOKEN = ws.token;
  const SELF_ID = ws.igUserId;
  const ctx = ctxFor(ws);

  const b = await req.json();
  const mediaId: string = b.mediaId;
  const delayMs: number = Math.max(30, b.delaySeconds ?? 30) * 1000;
  if (!mediaId) return NextResponse.json({ error: "mediaId obrigatório" }, { status: 400 });

  // automação: usa a informada, ou procura uma ativa que cubra esse post
  // (prioriza automações específicas do post sobre as de "qualquer vídeo")
  const all = await getAutomations(ws.id);
  const automation = b.automationId
    ? all.find((a) => a.id === b.automationId)
    : (all.find(
        (a) => a.active && a.trigger.type === "comment" && a.trigger.postIds?.includes(mediaId),
      ) ??
      all.find((a) => a.active && a.trigger.type === "comment" && !a.trigger.postIds));
  if (!automation) {
    return NextResponse.json({ error: "Nenhuma automação ativa cobre esse post" }, { status: 400 });
  }

  // 1. Busca todos os comentários do vídeo (paginado)
  const comments: RawComment[] = [];
  let url = `${GRAPH}/${mediaId}/comments?fields=id,text,timestamp,username,from&limit=50&access_token=${TOKEN}`;
  for (let page = 0; page < 10 && url; page++) {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data?.error?.message ?? "erro ao buscar comentários" }, { status: 500 });
    }
    comments.push(...(data.data ?? []));
    url = data.paging?.next ?? "";
  }

  // 2. Filtra: casa palavra-chave, não é a própria conta, ainda não recebeu o fluxo
  const kws = automation.trigger.keywords.map((k) => k.toLowerCase().trim()).filter(Boolean);
  const matches = (t: string) => {
    if (automation.trigger.matchType === "any") return true;
    const lower = t.toLowerCase();
    return automation.trigger.matchType === "exact"
      ? kws.includes(lower.trim())
      : kws.some((k) => lower.includes(k));
  };

  const inbox = await getInbox(ws.id);
  const jaReceberam = new Set(
    inbox.filter((m) => m.direction === "out" && m.via === "bot").map((m) => m.contactId),
  );

  // janela da Meta: private reply só funciona até 7 dias após o comentário
  const cutoff = Date.now() - 6.5 * 24 * 60 * 60 * 1000;
  let foraDaJanela = 0;

  const fila = comments.filter((c) => {
    const fromId = c.from?.id;
    if (!fromId || fromId === SELF_ID) return false;
    if (!c.text || !matches(c.text)) return false;
    if (jaReceberam.has(fromId)) return false;
    if (c.timestamp && new Date(c.timestamp).getTime() < cutoff) {
      foraDaJanela++;
      return false;
    }
    return true;
  });

  // dedupe por pessoa (se comentou 2x, processa só o comentário mais recente)
  const porPessoa = new Map<string, RawComment>();
  for (const c of fila) porPessoa.set(c.from!.id!, c);
  const queue = Array.from(porPessoa.values());

  progress = { total: queue.length, done: 0, skipped: fila.length - queue.length, errors: 0, finished: false };
  running = true;

  // 3. Processa em segundo plano com delay entre cada pessoa
  (async () => {
    console.log(`[backfill] iniciando: ${queue.length} pessoas, delay ${delayMs / 1000}s`);
    for (const c of queue) {
      try {
        await handleComment(ctx, {
          commentId: c.id,
          text: c.text!,
          fromId: c.from!.id!,
          fromUsername: c.from!.username ?? c.username,
          mediaId,
        });
        progress.done++;
        console.log(`[backfill] ${progress.done}/${progress.total} → @${c.from!.username ?? c.from!.id}`);
      } catch (e) {
        progress.errors++;
        console.error(`[backfill] erro com @${c.from?.username}:`, e instanceof Error ? e.message : e);
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    running = false;
    progress.finished = true;
    console.log(`[backfill] concluído: ${progress.done} enviados, ${progress.errors} erros`);
  })();

  return NextResponse.json({
    started: true,
    queued: queue.length,
    skippedDuplicates: fila.length - queue.length,
    skippedOutOf7DayWindow: foraDaJanela,
    totalComments: comments.length,
    delaySeconds: delayMs / 1000,
    estimatedMinutes: Math.ceil((queue.length * delayMs) / 60000),
  });
}
