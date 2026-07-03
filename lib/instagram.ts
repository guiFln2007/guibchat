// Cliente da Instagram API (API with Instagram Login), por conta.
// Cada workspace tem seu token + IG User ID, então o cliente é criado por conta:
//   const ig = igClient({ token, igUserId });  ig.sendDm(...)
// Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/

import { StepButton, IgMedia } from "./types";

const GRAPH = "https://graph.instagram.com/v23.0";

export interface IgCreds {
  token: string;
  igUserId: string;
}

/** Monta payload de mensagem com botões (postback "next" ou web_url) */
function buildMessage(text: string, buttons: StepButton[], payloadPrefix: string) {
  const valid = buttons.filter((b) => b.title?.trim());
  if (valid.length === 0) return { text };
  return {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text,
        buttons: valid.slice(0, 3).map((b, i) =>
          b.type === "url"
            ? { type: "web_url", url: b.url, title: b.title.slice(0, 20) }
            : { type: "postback", title: b.title.slice(0, 20), payload: `${payloadPrefix}:${i}` },
        ),
      },
    },
  };
}

export function igClient({ token, igUserId }: IgCreds) {
  async function igFetch(path: string, init?: RequestInit) {
    const res = await fetch(`${GRAPH}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = body?.error?.message ?? res.statusText;
      throw new Error(`IG API ${res.status}: ${msg}`);
    }
    return body;
  }

  return {
    igUserId,
    token,

    /** Lista as mídias da conta (pro seletor de posts do editor) */
    async getMedia(limit = 24): Promise<IgMedia[]> {
      const r = await igFetch(
        `/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=${limit}`,
      );
      return r.data ?? [];
    },

    /** Responde publicamente a um comentário */
    async replyToComment(commentId: string, message: string) {
      return igFetch(`/${commentId}/replies`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
    },

    /** DM privada em resposta a um comentário (Private Reply — janela de 7 dias) */
    async privateReplyToComment(
      commentId: string,
      text: string,
      buttons: StepButton[] = [],
      payloadPrefix = "",
    ) {
      return igFetch(`/${igUserId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          recipient: { comment_id: commentId },
          message: buildMessage(text, buttons, payloadPrefix),
        }),
      });
    },

    /** DM pra um usuário (janela de 24h) */
    async sendDm(recipientId: string, text: string, buttons: StepButton[] = [], payloadPrefix = "") {
      return igFetch(`/${igUserId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: buildMessage(text, buttons, payloadPrefix),
        }),
      });
    },

    /**
     * Verifica se o usuário segue a conta (campo is_user_follow_business).
     * Retorna true/false, ou null se a API não informar (aí não bloqueamos a entrega).
     */
    async checkUserFollows(userId: string): Promise<boolean | null> {
      try {
        const r = await igFetch(`/${userId}?fields=username,is_user_follow_business`);
        if (typeof r.is_user_follow_business === "boolean") return r.is_user_follow_business;
        return null;
      } catch (e) {
        console.error("[follow-check] falhou:", e instanceof Error ? e.message : e);
        return null;
      }
    },
  };
}

export type IgClient = ReturnType<typeof igClient>;

// ===== OAuth (Instagram Login) — fluxo de "Conectar Instagram" =====

const IG_OAUTH_SCOPES =
  "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments";

/** Monta a URL de autorização da Meta pra onde o botão "Conectar Instagram" leva. */
export function instagramAuthUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: IG_OAUTH_SCOPES,
    state,
    force_authentication: "1",
  });
  return `https://www.instagram.com/oauth/authorize?${p.toString()}`;
}

/**
 * Troca o `code` do callback por: token long-lived + IG User ID + @username.
 * 1) code → token curto · 2) token curto → token longo (60 dias) · 3) perfil.
 */
export async function exchangeInstagramCode(
  code: string,
  redirectUri: string,
): Promise<{ token: string; igUserId: string; username: string }> {
  const clientId = process.env.INSTAGRAM_APP_ID!;
  const secret = process.env.INSTAGRAM_APP_SECRET!;

  // 1. token curto
  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: secret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code: code.replace(/#_$/, ""),
  });
  const r1 = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form });
  const d1 = await r1.json().catch(() => ({}));
  if (!r1.ok || !d1.access_token) throw new Error(d1?.error_message ?? "falha ao trocar o código");

  // 2. token longo (60 dias)
  const r2 = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${secret}&access_token=${d1.access_token}`,
  );
  const d2 = await r2.json().catch(() => ({}));
  if (!r2.ok || !d2.access_token) throw new Error(d2?.error?.message ?? "falha ao gerar token long-lived");

  // 3. perfil (IG User ID + username)
  const r3 = await fetch(`${GRAPH}/me?fields=user_id,username&access_token=${d2.access_token}`);
  const d3 = await r3.json().catch(() => ({}));
  if (!r3.ok) throw new Error(d3?.error?.message ?? "falha ao ler o perfil");

  return {
    token: d2.access_token as string,
    igUserId: String(d3.user_id ?? d3.id),
    username: d3.username ?? "",
  };
}

/** Renova um token long-lived (validade volta pra 60 dias). Devolve o novo token ou lança. */
export async function refreshToken(token: string): Promise<string> {
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`,
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(body?.error?.message ?? "falha ao renovar token");
  }
  return body.access_token as string;
}
