// Registro de workspaces (contas) no Supabase. Cada workspace é uma conta de
// Instagram isolada: dados próprios (scopeados por workspace_id) e token próprio.
// Server-only (usa a secret key + scrypt). Não importar no middleware/edge.
import { supabase } from "./supabase";
import { verifyPassword } from "./password";

export interface WorkspaceLogin {
  username: string;
  salt: string;
  hash: string;
}

export interface Workspace {
  /** id interno, usado pra escopar os dados (kebab-case, estável) */
  id: string;
  /** nome de exibição (ex.: "Pogere Ads") */
  name: string;
  /** @handle do Instagram (sem @) */
  handle: string;
  /** IG User ID — é por ele que o webhook roteia o evento (entry.id) */
  igUserId: string;
  /** token long-lived da conta */
  token: string;
  /** credenciais de acesso ao dashboard */
  login: WorkspaceLogin;
  /** dono (Gabriel) — reservado pra futuros poderes de admin */
  owner?: boolean;
}

/** Versão segura pra mandar ao cliente — sem token nem hash de senha. */
export interface PublicWorkspace {
  id: string;
  name: string;
  handle: string;
  igUserId: string;
  owner: boolean;
}

function rowToWorkspace(r: Record<string, unknown>): Workspace {
  return {
    id: r.id as string,
    name: r.name as string,
    handle: r.handle as string,
    igUserId: r.ig_user_id as string,
    token: r.token as string,
    login: {
      username: r.login_username as string,
      salt: r.login_salt as string,
      hash: r.login_hash as string,
    },
    owner: !!r.owner,
  };
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase.from("workspaces").select("*");
  if (error) throw error;
  return (data ?? []).map(rowToWorkspace);
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToWorkspace(data) : null;
}

/** Roteamento do webhook: acha a conta dona do evento pelo IG User ID. */
export async function getWorkspaceByIgUserId(igUserId: string): Promise<Workspace | null> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("ig_user_id", igUserId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToWorkspace(data) : null;
}

/** Login: valida usuário + senha e devolve o workspace. */
export async function authenticate(username: string, password: string): Promise<Workspace | null> {
  const u = username.trim().toLowerCase();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .ilike("login_username", u)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const ws = rowToWorkspace(data);
  return verifyPassword(password, ws.login.salt, ws.login.hash) ? ws : null;
}

export function toPublic(w: Workspace): PublicWorkspace {
  return { id: w.id, name: w.name, handle: w.handle, igUserId: w.igUserId, owner: !!w.owner };
}

/** Atualiza só o token de uma conta (usado pela renovação automática). */
export async function updateToken(id: string, token: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("workspaces")
    .update({ token })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Conecta (ou troca) o Instagram de uma conta após o OAuth. */
export async function connectInstagram(
  id: string,
  data: { igUserId: string; token: string; handle?: string },
): Promise<boolean> {
  // não deixa o mesmo Instagram em duas contas
  const { data: clash, error: clashErr } = await supabase
    .from("workspaces")
    .select("id")
    .eq("ig_user_id", data.igUserId)
    .neq("id", id)
    .maybeSingle();
  if (clashErr) throw clashErr;
  if (clash) throw new Error("Esse Instagram já está conectado em outra conta.");

  const row: Record<string, unknown> = {
    ig_user_id: data.igUserId,
    token: data.token,
  };
  if (data.handle) row.handle = data.handle;
  const { data: updated, error } = await supabase
    .from("workspaces")
    .update(row)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  return (updated?.length ?? 0) > 0;
}
