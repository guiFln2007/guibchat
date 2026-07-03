// Motor de automações: evento → automação → sequência de ações.
// Tudo escopado a um workspace (conta): o contexto carrega o id da conta,
// o IG User ID (pra anti-loop) e o cliente IG já com o token certo.
import { Automation, LogEntry } from "./types";
import {
  getAutomations,
  bumpStats,
  addLog,
  alreadyProcessed,
  upsertContact,
  addInboxMessage,
} from "./store";
import { IgClient, igClient } from "./instagram";
import type { Workspace } from "./workspaces";

/** Contexto da conta que está processando o evento. */
export interface Ctx {
  wsId: string;
  igUserId: string;
  name: string;
  ig: IgClient;
}

/** Monta o contexto de execução a partir de um workspace. */
export function ctxFor(ws: Workspace): Ctx {
  return {
    wsId: ws.id,
    igUserId: ws.igUserId,
    name: ws.name,
    ig: igClient({ token: ws.token, igUserId: ws.igUserId }),
  };
}

function msgId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function matchKeyword(a: Automation, text: string): string | null {
  const t = text.toLowerCase().trim();
  if (a.trigger.matchType === "any") return "(qualquer)";
  for (const kw of a.trigger.keywords) {
    const k = kw.toLowerCase().trim();
    if (!k) continue;
    if (a.trigger.matchType === "exact" ? t === k : t.includes(k)) return kw;
  }
  return null;
}

function pickRandom<T>(arr: T[]): T | undefined {
  const valid = arr.filter(Boolean);
  return valid[Math.floor(Math.random() * valid.length)];
}

/**
 * Escolhe o próximo passo a enviar depois de `afterIdx`.
 * Se o próximo for um follow-gate e a pessoa JÁ SEGUE a conta, pula ele
 * e vai direto pro passo seguinte (ninguém que já segue vê o "Quase lá!").
 */
async function resolveNextStep(
  ctx: Ctx,
  a: Automation,
  fromId: string,
  afterIdx: number,
): Promise<{ step: { s: Automation["steps"][number]; i: number } | undefined; gateSkipped: boolean }> {
  const candidates = a.steps
    .map((s, i) => ({ s, i }))
    .filter(({ s, i }) => i > afterIdx && s.enabled && s.text?.trim());
  if (candidates.length === 0) return { step: undefined, gateSkipped: false };

  if (candidates[0].s.kind === "follow_gate") {
    const follows = await ctx.ig.checkUserFollows(fromId);
    if (follows === true) {
      return { step: candidates[1], gateSkipped: true };
    }
  }
  return { step: candidates[0], gateSkipped: false };
}

function newLog(partial: Omit<LogEntry, "id" | "timestamp">): LogEntry {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...partial,
  };
}

export interface CommentEvent {
  commentId: string;
  text: string;
  fromId: string;
  fromUsername?: string;
  mediaId?: string;
}

export interface DmEvent {
  messageId: string;
  text: string;
  fromId: string;
}

export interface PostbackEvent {
  payload: string; // formato: auto:<automationId>:<stepIndex>:<buttonIndex>
  fromId: string;
}

/** Comentário novo → resposta pública (rotativa) + 1º passo da sequência via private reply */
export async function handleComment(ctx: Ctx, ev: CommentEvent) {
  if (ev.fromId === ctx.igUserId) return;
  if (await alreadyProcessed(`${ctx.wsId}:c_${ev.commentId}`)) return;

  await upsertContact(ctx.wsId, { id: ev.fromId, username: ev.fromUsername, source: "comment" });
  await addInboxMessage(ctx.wsId, {
    id: msgId(),
    contactId: ev.fromId,
    contactUsername: ev.fromUsername,
    direction: "in",
    text: `💬 comentou: "${ev.text}"`,
    timestamp: new Date().toISOString(),
    via: "comment",
  });

  const automations = (await getAutomations(ctx.wsId)).filter(
    (a) => a.active && a.trigger.type === "comment",
  );

  for (const a of automations) {
    // filtro de publicação (null = qualquer)
    if (a.trigger.postIds && ev.mediaId && !a.trigger.postIds.includes(ev.mediaId)) continue;

    const kw = matchKeyword(a, ev.text);
    if (!kw) continue;

    const actions: string[] = [];
    let ok = true;
    let error: string | undefined;

    try {
      // 1º passo da sequência via private reply (pula follow-gate se já segue)
      const { step: first, gateSkipped } = await resolveNextStep(ctx, a, ev.fromId, -1);
      if (gateSkipped) actions.push("já segue → follow-gate pulado ⏭️");
      if (first) {
        await ctx.ig.privateReplyToComment(
          ev.commentId,
          first.s.text,
          first.s.buttons,
          `auto:${a.id}:${first.i}`,
        );
        actions.push(`dm_passo_${first.i + 1} (${first.s.kind})`);
        await bumpStats(ctx.wsId, a.id, "dmsSent");
        await addInboxMessage(ctx.wsId, {
          id: msgId(),
          contactId: ev.fromId,
          contactUsername: ev.fromUsername,
          direction: "out",
          text: first.s.text,
          timestamp: new Date().toISOString(),
          via: "bot",
        });
      }

      // resposta pública rotativa
      const reply = pickRandom(a.publicReplies);
      if (reply) {
        await ctx.ig.replyToComment(ev.commentId, reply);
        actions.push("comentario_respondido");
        await bumpStats(ctx.wsId, a.id, "commentsReplied");
      }
    } catch (e) {
      ok = false;
      error = e instanceof Error ? e.message : String(e);
    }

    await bumpStats(ctx.wsId, a.id, "triggered");
    await addLog(ctx.wsId, newLog({
      automationId: a.id,
      automationName: a.name,
      event: "comment",
      fromUsername: ev.fromUsername,
      fromId: ev.fromId,
      matchedKeyword: kw,
      text: ev.text,
      actions,
      ok,
      error,
    }));

    break;
  }
}

/** DM nova com palavra-chave → 1º passo da sequência */
export async function handleDm(ctx: Ctx, ev: DmEvent) {
  if (ev.fromId === ctx.igUserId) return;
  if (await alreadyProcessed(`${ctx.wsId}:m_${ev.messageId}`)) return;

  await upsertContact(ctx.wsId, { id: ev.fromId, source: "dm" });
  await addInboxMessage(ctx.wsId, {
    id: msgId(),
    contactId: ev.fromId,
    direction: "in",
    text: ev.text,
    timestamp: new Date().toISOString(),
    via: "dm",
  });

  const automations = (await getAutomations(ctx.wsId)).filter(
    (a) => a.active && a.trigger.type === "dm",
  );

  for (const a of automations) {
    const kw = matchKeyword(a, ev.text);
    if (!kw) continue;

    const actions: string[] = [];
    let ok = true;
    let error: string | undefined;

    try {
      const { step: first, gateSkipped } = await resolveNextStep(ctx, a, ev.fromId, -1);
      if (gateSkipped) actions.push("já segue → follow-gate pulado ⏭️");
      if (first) {
        await ctx.ig.sendDm(ev.fromId, first.s.text, first.s.buttons, `auto:${a.id}:${first.i}`);
        actions.push(`dm_passo_${first.i + 1} (${first.s.kind})`);
        await bumpStats(ctx.wsId, a.id, "dmsSent");
        await addInboxMessage(ctx.wsId, {
          id: msgId(),
          contactId: ev.fromId,
          direction: "out",
          text: first.s.text,
          timestamp: new Date().toISOString(),
          via: "bot",
        });
      }
    } catch (e) {
      ok = false;
      error = e instanceof Error ? e.message : String(e);
    }

    await bumpStats(ctx.wsId, a.id, "triggered");
    await addLog(ctx.wsId, newLog({
      automationId: a.id,
      automationName: a.name,
      event: "dm",
      fromId: ev.fromId,
      matchedKeyword: kw,
      text: ev.text,
      actions,
      ok,
      error,
    }));

    break;
  }
}

/** Clique em botão "next" → envia o próximo passo habilitado da sequência */
export async function handlePostback(ctx: Ctx, ev: PostbackEvent) {
  const m = ev.payload.match(/^auto:([^:]+):(\d+)/);
  if (!m) return;
  const [, automationId, stepIdxStr] = m;
  const currentIdx = parseInt(stepIdxStr, 10);

  const a = (await getAutomations(ctx.wsId)).find((x) => x.id === automationId);
  if (!a || !a.active) return;

  await bumpStats(ctx.wsId, a.id, "clicks");

  const actions: string[] = [];
  let ok = true;
  let error: string | undefined;

  // FOLLOW-GATE: se o botão clicado era do passo "siga pra receber",
  // verifica DE VERDADE se a pessoa segue. Se não segue, repete a mensagem.
  const clickedStep = a.steps[currentIdx];
  if (clickedStep?.kind === "follow_gate") {
    const follows = await ctx.ig.checkUserFollows(ev.fromId);
    if (follows === false) {
      try {
        await ctx.ig.sendDm(ev.fromId, clickedStep.text, clickedStep.buttons, `auto:${a.id}:${currentIdx}`);
        actions.push("nao_segue_ainda → repetiu follow-gate");
        await bumpStats(ctx.wsId, a.id, "dmsSent");
        await addInboxMessage(ctx.wsId, {
          id: msgId(),
          contactId: ev.fromId,
          direction: "out",
          text: clickedStep.text,
          timestamp: new Date().toISOString(),
          via: "bot",
        });
      } catch (e) {
        ok = false;
        error = e instanceof Error ? e.message : String(e);
      }
      await addLog(ctx.wsId, newLog({
        automationId: a.id,
        automationName: a.name,
        event: "postback",
        fromId: ev.fromId,
        text: `clicou "Seguindo" mas ainda não segue 🙅`,
        actions,
        ok,
        error,
      }));
      return; // não libera o material
    }
    actions.push(follows === true ? "✓ confirmado: está seguindo" : "follow não verificável → liberado");
  }

  // próximo passo (pulando o follow-gate se a pessoa já segue)
  const { step: next, gateSkipped } = await resolveNextStep(ctx, a, ev.fromId, currentIdx);
  if (gateSkipped) actions.push("já segue → follow-gate pulado ⏭️");

  try {
    if (next) {
      await ctx.ig.sendDm(ev.fromId, next.s.text, next.s.buttons, `auto:${a.id}:${next.i}`);
      actions.push(`dm_passo_${next.i + 1} (${next.s.kind})`);
      await bumpStats(ctx.wsId, a.id, "dmsSent");
      await addInboxMessage(ctx.wsId, {
        id: msgId(),
        contactId: ev.fromId,
        direction: "out",
        text: next.s.text,
        timestamp: new Date().toISOString(),
        via: "bot",
      });
    } else {
      actions.push("sequencia_concluida");
    }
  } catch (e) {
    ok = false;
    error = e instanceof Error ? e.message : String(e);
  }

  await addLog(ctx.wsId, newLog({
    automationId: a.id,
    automationName: a.name,
    event: "postback",
    fromId: ev.fromId,
    text: `clicou em botão (passo ${currentIdx + 1})`,
    actions,
    ok,
    error,
  }));
}
