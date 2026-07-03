// Sessão por cookie assinado (HMAC-SHA256 via Web Crypto — funciona no middleware/edge e no Node).
// Guarda só o id do workspace ativo; o token do IG nunca vai pro cliente.

const COOKIE = "gob_session";
const SECRET = process.env.SESSION_SECRET || "meuchat-dev-secret-trocar-em-prod";

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64url(sig);
}

/** Gera o valor do cookie de sessão pra um workspace. */
export async function signSession(wsId: string): Promise<string> {
  const sig = await hmac(wsId);
  return `${wsId}.${sig}`;
}

/** Valida o cookie e devolve o wsId, ou null se inválido. Comparação em tempo constante. */
export async function verifySession(value: string | undefined): Promise<string | null> {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 1) return null;
  const wsId = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = await hmac(wsId);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? wsId : null;
}

export const SESSION_COOKIE = COOKIE;
