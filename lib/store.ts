// Armazenamento no Supabase (Postgres), isolado por workspace (conta).
// Mesmas funções da v1 (JSON local) — só trocou o miolo de fs por Supabase.
// Server-only (usa a secret key). Não importar no middleware/edge.
import { supabase } from "./supabase";
import { Automation, LogEntry, Contact, InboxMessage } from "./types";

const MAX_LOGS = 500;

// ---- Mappers (row snake_case <-> objeto camelCase) ----

function rowToAutomation(r: Record<string, unknown>): Automation {
  return {
    id: r.id as string,
    name: r.name as string,
    active: r.active as boolean,
    createdAt: r.created_at as string,
    trigger: r.trigger as Automation["trigger"],
    publicReplies: (r.public_replies as string[]) ?? [],
    steps: (r.steps as Automation["steps"]) ?? [],
    stats: (r.stats as Automation["stats"]) ?? {
      triggered: 0,
      dmsSent: 0,
      commentsReplied: 0,
      clicks: 0,
    },
  };
}

function automationToRow(wsId: string, a: Automation) {
  return {
    id: a.id,
    workspace_id: wsId,
    name: a.name,
    active: a.active,
    created_at: a.createdAt,
    trigger: a.trigger,
    public_replies: a.publicReplies ?? [],
    steps: a.steps ?? [],
    stats: a.stats ?? { triggered: 0, dmsSent: 0, commentsReplied: 0, clicks: 0 },
  };
}

function rowToContact(r: Record<string, unknown>): Contact {
  return {
    id: r.id as string,
    username: (r.username as string) ?? undefined,
    source: r.source as Contact["source"],
    status: r.status as Contact["status"],
    firstInteraction: r.first_interaction as string,
    lastInteraction: r.last_interaction as string,
    interactions: (r.interactions as number) ?? 1,
  };
}

function rowToInbox(r: Record<string, unknown>): InboxMessage {
  return {
    id: r.id as string,
    contactId: r.contact_id as string,
    contactUsername: (r.contact_username as string) ?? undefined,
    direction: r.direction as InboxMessage["direction"],
    text: r.text as string,
    timestamp: r.timestamp as string,
    via: r.via as InboxMessage["via"],
  };
}

function rowToLog(r: Record<string, unknown>): LogEntry {
  return {
    id: r.id as string,
    timestamp: r.timestamp as string,
    automationId: (r.automation_id as string) ?? "",
    automationName: (r.automation_name as string) ?? "",
    event: r.event as LogEntry["event"],
    fromUsername: (r.from_username as string) ?? undefined,
    fromId: r.from_id as string,
    matchedKeyword: (r.matched_keyword as string) ?? undefined,
    text: (r.text as string) ?? "",
    actions: (r.actions as string[]) ?? [],
    ok: r.ok as boolean,
    error: (r.error as string) ?? undefined,
  };
}

// ---- Automações ----

export async function getAutomations(wsId: string): Promise<Automation[]> {
  const { data, error } = await supabase
    .from("automations")
    .select("*")
    .eq("workspace_id", wsId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToAutomation);
}

export async function saveAutomations(wsId: string, list: Automation[]) {
  // Substitui o conjunto da conta: faz upsert da lista e remove os que sumiram.
  if (list.length) {
    const { error } = await supabase
      .from("automations")
      .upsert(list.map((a) => automationToRow(wsId, a)));
    if (error) throw error;
  }
  const ids = list.map((a) => a.id);
  let del = supabase.from("automations").delete().eq("workspace_id", wsId);
  if (ids.length) del = del.not("id", "in", `(${ids.map((i) => `"${i}"`).join(",")})`);
  const { error: delErr } = await del;
  if (delErr) throw delErr;
}

export async function addAutomation(wsId: string, a: Automation) {
  const { error } = await supabase.from("automations").insert(automationToRow(wsId, a));
  if (error) throw error;
}

export async function updateAutomation(wsId: string, id: string, patch: Partial<Automation>) {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.active !== undefined) row.active = patch.active;
  if (patch.trigger !== undefined) row.trigger = patch.trigger;
  if (patch.publicReplies !== undefined) row.public_replies = patch.publicReplies;
  if (patch.steps !== undefined) row.steps = patch.steps;
  if (patch.stats !== undefined) row.stats = patch.stats;
  if (Object.keys(row).length === 0) return true;

  const { data, error } = await supabase
    .from("automations")
    .update(row)
    .eq("workspace_id", wsId)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function deleteAutomation(wsId: string, id: string) {
  const { error } = await supabase
    .from("automations")
    .delete()
    .eq("workspace_id", wsId)
    .eq("id", id);
  if (error) throw error;
}

export async function bumpStats(wsId: string, id: string, field: keyof Automation["stats"]) {
  const { data, error } = await supabase
    .from("automations")
    .select("stats")
    .eq("workspace_id", wsId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;
  const stats = (data.stats as Automation["stats"]) ?? {
    triggered: 0,
    dmsSent: 0,
    commentsReplied: 0,
    clicks: 0,
  };
  stats[field] = (stats[field] ?? 0) + 1;
  const { error: upErr } = await supabase
    .from("automations")
    .update({ stats })
    .eq("workspace_id", wsId)
    .eq("id", id);
  if (upErr) throw upErr;
}

// ---- Logs ----

export async function getLogs(wsId: string): Promise<LogEntry[]> {
  const { data, error } = await supabase
    .from("logs")
    .select("*")
    .eq("workspace_id", wsId)
    .order("timestamp", { ascending: false })
    .limit(MAX_LOGS);
  if (error) throw error;
  return (data ?? []).map(rowToLog);
}

export async function addLog(wsId: string, entry: LogEntry) {
  const { error } = await supabase.from("logs").insert({
    id: entry.id,
    workspace_id: wsId,
    timestamp: entry.timestamp,
    automation_id: entry.automationId,
    automation_name: entry.automationName,
    event: entry.event,
    from_username: entry.fromUsername ?? null,
    from_id: entry.fromId,
    matched_keyword: entry.matchedKeyword ?? null,
    text: entry.text,
    actions: entry.actions ?? [],
    ok: entry.ok,
    error: entry.error ?? null,
  });
  if (error) throw error;
}

// ---- Contatos ----

export async function getContacts(wsId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("workspace_id", wsId)
    .order("last_interaction", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToContact);
}

/** Cria/atualiza um contato a cada interação */
export async function upsertContact(
  wsId: string,
  c: { id: string; username?: string; source: Contact["source"] },
) {
  const now = new Date().toISOString();
  const { data: found, error } = await supabase
    .from("contacts")
    .select("interactions")
    .eq("workspace_id", wsId)
    .eq("id", c.id)
    .maybeSingle();
  if (error) throw error;

  if (found) {
    const row: Record<string, unknown> = {
      last_interaction: now,
      interactions: ((found.interactions as number) ?? 0) + 1,
    };
    if (c.username) row.username = c.username;
    const { error: upErr } = await supabase
      .from("contacts")
      .update(row)
      .eq("workspace_id", wsId)
      .eq("id", c.id);
    if (upErr) throw upErr;
  } else {
    const { error: insErr } = await supabase.from("contacts").insert({
      workspace_id: wsId,
      id: c.id,
      username: c.username ?? null,
      source: c.source,
      status: "inscrito",
      first_interaction: now,
      last_interaction: now,
      interactions: 1,
    });
    if (insErr) throw insErr;
  }
}

// ---- Caixa de Entrada ----

export async function getInbox(wsId: string): Promise<InboxMessage[]> {
  const { data, error } = await supabase
    .from("inbox")
    .select("*")
    .eq("workspace_id", wsId)
    .order("timestamp", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToInbox);
}

export async function addInboxMessage(wsId: string, m: InboxMessage) {
  const { error } = await supabase.from("inbox").insert({
    id: m.id,
    workspace_id: wsId,
    contact_id: m.contactId,
    contact_username: m.contactUsername ?? null,
    direction: m.direction,
    text: m.text,
    timestamp: m.timestamp,
    via: m.via,
  });
  if (error) throw error;
}

// ---- Dedup de eventos (evita processar o mesmo webhook 2x) ----
// Em serverless cada invocação é isolada — o dedup vive no banco.
// A PK de processed_events garante atomicidade: insert duplicado = já processado.

export async function alreadyProcessed(eventId: string): Promise<boolean> {
  const { error } = await supabase.from("processed_events").insert({ event_id: eventId });
  if (error) {
    if (error.code === "23505") return true; // violação de PK = já visto
    console.error("processed_events insert error:", error.message);
    return false; // erro inesperado: não bloqueia o processamento
  }
  return false;
}
