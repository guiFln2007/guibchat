// Webhook da Meta — recebe eventos de comentários, DMs e cliques em botões
import { NextRequest, NextResponse, after } from "next/server";
import crypto from "crypto";
import { handleComment, handleDm, handlePostback, ctxFor } from "@/lib/engine";
import { getWorkspaceByIgUserId } from "@/lib/workspaces";

// Dá folga pro after() concluir as chamadas à API do IG antes de a função encerrar.
export const maxDuration = 30;

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN!;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET!;

/** GET: verificação do webhook (a Meta chama isso ao salvar a URL) */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/** POST: eventos em tempo real */
export async function POST(req: NextRequest) {
  const raw = await req.text();

  // Valida assinatura (X-Hub-Signature-256)
  const sig = req.headers.get("x-hub-signature-256");
  if (sig && APP_SECRET) {
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", APP_SECRET).update(raw).digest("hex");
    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return new NextResponse("Invalid signature", { status: 401 });
    }
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  // Responde 200 na hora (Meta exige), mas o after() mantém a função viva
  // até o processamento terminar — em serverless (Vercel) um fire-and-forget
  // comum seria morto logo após a resposta, antes de a DM ser enviada.
  after(async () => {
    try {
      await processEvents(body);
    } catch (e) {
      console.error("[webhook] erro:", e);
    }
  });

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}

// ---- Parsing dos eventos ----

interface WebhookBody {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        id?: string;
        text?: string;
        from?: { id?: string; username?: string };
        media?: { id?: string };
      };
    }>;
    messaging?: Array<{
      sender?: { id?: string };
      recipient?: { id?: string };
      message?: {
        mid?: string;
        text?: string;
        is_echo?: boolean;
        quick_reply?: { payload?: string };
      };
      postback?: { mid?: string; payload?: string; title?: string };
    }>;
  }>;
}

async function processEvents(body: WebhookBody) {
  for (const entry of body.entry ?? []) {
    // entry.id = IG User ID que recebeu o evento → roteia pra conta dona dele
    const ws = entry.id ? await getWorkspaceByIgUserId(entry.id) : null;
    if (!ws) {
      console.warn(`[webhook] evento para conta desconhecida (entry.id=${entry.id}) — ignorado`);
      continue;
    }
    const ctx = ctxFor(ws);

    // Comentários
    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") continue;
      const v = change.value;
      if (!v?.id || !v.text || !v.from?.id) continue;
      console.log(`[webhook:${ws.handle}] comentário de @${v.from.username}: "${v.text}"`);
      await handleComment(ctx, {
        commentId: v.id,
        text: v.text,
        fromId: v.from.id,
        fromUsername: v.from.username,
        mediaId: v.media?.id,
      });
    }

    // Mensagens e cliques em botões
    for (const msg of entry.messaging ?? []) {
      const senderId = msg.sender?.id;
      if (!senderId) continue;

      // Clique em botão postback
      const payload = msg.postback?.payload ?? msg.message?.quick_reply?.payload;
      if (payload) {
        console.log(`[webhook:${ws.handle}] postback de ${senderId}: ${payload}`);
        await handlePostback(ctx, { payload, fromId: senderId });
        continue;
      }

      // DM de texto
      if (msg.message?.text && !msg.message.is_echo && msg.message.mid) {
        console.log(`[webhook:${ws.handle}] DM de ${senderId}: "${msg.message.text}"`);
        await handleDm(ctx, {
          messageId: msg.message.mid,
          text: msg.message.text,
          fromId: senderId,
        });
      }
    }
  }
}
