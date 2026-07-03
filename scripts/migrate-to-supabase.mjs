// Sobe os dados locais (data/) pro Supabase. Idempotente (upsert) — pode rodar de novo.
// Migra SÓ as contas donas (owner: true) — a conta de teste "parceiro-teste" fica de fora.
// Uso: node scripts/migrate-to-supabase.mjs
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + "/..";

// --- carrega .env (sem dependência externa) ---
function loadEnv() {
  const env = {};
  const raw = readFileSync(path.join(ROOT, ".env"), "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}
const env = loadEnv();
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

function readJson(p, fallback) {
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf-8")) : fallback;
}

async function run() {
  const workspaces = readJson(path.join(ROOT, "data", "workspaces.json"), []);
  const owners = workspaces.filter((w) => w.owner === true);
  console.log(`Workspaces donos a migrar: ${owners.map((w) => w.id).join(", ") || "(nenhum)"}`);

  for (const w of owners) {
    // 1) workspace
    const { error: wErr } = await supabase.from("workspaces").upsert({
      id: w.id,
      name: w.name,
      handle: w.handle,
      ig_user_id: w.igUserId,
      token: w.token,
      login_username: w.login.username,
      login_salt: w.login.salt,
      login_hash: w.login.hash,
      owner: !!w.owner,
    });
    if (wErr) throw wErr;
    console.log(`✓ workspace ${w.id}`);

    const dir = path.join(ROOT, "data", "accounts", w.id);

    // 2) automações
    const autos = readJson(path.join(dir, "automations.json"), []);
    if (autos.length) {
      const rows = autos.map((a) => ({
        id: a.id,
        workspace_id: w.id,
        name: a.name,
        active: a.active,
        created_at: a.createdAt,
        trigger: a.trigger,
        public_replies: a.publicReplies ?? [],
        steps: a.steps ?? [],
        stats: a.stats ?? { triggered: 0, dmsSent: 0, commentsReplied: 0, clicks: 0 },
      }));
      const { error } = await supabase.from("automations").upsert(rows);
      if (error) throw error;
      console.log(`  ✓ ${rows.length} automações`);
    }

    // 3) contatos
    const contacts = readJson(path.join(dir, "contacts.json"), []);
    if (contacts.length) {
      const rows = contacts.map((c) => ({
        workspace_id: w.id,
        id: c.id,
        username: c.username ?? null,
        source: c.source,
        status: c.status ?? "inscrito",
        first_interaction: c.firstInteraction,
        last_interaction: c.lastInteraction,
        interactions: c.interactions ?? 1,
      }));
      const { error } = await supabase
        .from("contacts")
        .upsert(rows, { onConflict: "workspace_id,id" });
      if (error) throw error;
      console.log(`  ✓ ${rows.length} contatos`);
    }

    // 4) inbox
    const inbox = readJson(path.join(dir, "inbox.json"), []);
    if (inbox.length) {
      const rows = inbox.map((m) => ({
        id: m.id,
        workspace_id: w.id,
        contact_id: m.contactId,
        contact_username: m.contactUsername ?? null,
        direction: m.direction,
        text: m.text,
        timestamp: m.timestamp,
        via: m.via,
      }));
      const { error } = await supabase.from("inbox").upsert(rows);
      if (error) throw error;
      console.log(`  ✓ ${rows.length} mensagens de inbox`);
    }

    // 5) logs
    const logs = readJson(path.join(dir, "logs.json"), []);
    if (logs.length) {
      const rows = logs.map((l) => ({
        id: l.id,
        workspace_id: w.id,
        timestamp: l.timestamp,
        automation_id: l.automationId ?? null,
        automation_name: l.automationName ?? null,
        event: l.event,
        from_username: l.fromUsername ?? null,
        from_id: l.fromId,
        matched_keyword: l.matchedKeyword ?? null,
        text: l.text ?? "",
        actions: l.actions ?? [],
        ok: l.ok ?? true,
        error: l.error ?? null,
      }));
      const { error } = await supabase.from("logs").upsert(rows);
      if (error) throw error;
      console.log(`  ✓ ${rows.length} logs`);
    }
  }

  console.log("\n✅ Migração concluída.");
}

run().catch((e) => {
  console.error("❌ Erro na migração:", e.message ?? e);
  process.exit(1);
});
