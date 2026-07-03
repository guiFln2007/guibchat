// Resolve o workspace ativo a partir do cookie de sessão (uso em route handlers).
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "./session";
import { getWorkspace, type Workspace } from "./workspaces";

/** Workspace logado, ou null se não houver sessão válida. */
export async function activeWorkspace(): Promise<Workspace | null> {
  const store = await cookies();
  const wsId = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!wsId) return null;
  return getWorkspace(wsId);
}
