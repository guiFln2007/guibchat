// Migração single-tenant → multi-conta.
// 1. Move data/{automations,logs,contacts,inbox}.json → data/accounts/<id>/
// 2. Cria data/workspaces.json com a conta dona (token + ids vindos do .env)
//
// Uso: node scripts/migrate-multitenant.mjs <usuarioLogin> <senha>
//   ex: node scripts/migrate-multitenant.mjs seuemail@gmail.com SuaSenha123
//
// Idempotente: se já migrou, não duplica nem sobrescreve dados.

import { promises as fs } from "fs";
import { existsSync } from "fs";
import path from "path";
import { scryptSync, randomBytes } from "crypto";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const FILES = ["automations.json", "logs.json", "contacts.json", "inbox.json"];

function parseEnv(txt) {
  const out = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error("Uso: node scripts/migrate-multitenant.mjs <usuarioLogin> <senha>");
    process.exit(1);
  }

  const env = parseEnv(await fs.readFile(path.join(ROOT, ".env"), "utf-8"));
  const igUserId = env.IG_USER_ID;
  const handle = env.IG_USERNAME || "owner";
  const token = env.IG_ACCESS_TOKEN;
  // id estável da conta dona (= nome da pasta), derivado do handle
  const WS_ID = handle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!igUserId || !token) {
    console.error("Faltou IG_USER_ID ou IG_ACCESS_TOKEN no .env");
    process.exit(1);
  }

  // 1. mover dados existentes pra pasta da conta
  const accDir = path.join(DATA, "accounts", WS_ID);
  await fs.mkdir(accDir, { recursive: true });
  for (const f of FILES) {
    const src = path.join(DATA, f);
    const dst = path.join(accDir, f);
    if (existsSync(dst)) {
      console.log(`• ${f}: já existe na pasta da conta — pulado`);
      continue;
    }
    if (existsSync(src)) {
      await fs.rename(src, dst);
      console.log(`✓ ${f}: movido pra accounts/${WS_ID}/`);
    } else {
      console.log(`• ${f}: não existia — ignorado`);
    }
  }

  // 2. workspaces.json
  const wsFile = path.join(DATA, "workspaces.json");
  let list = [];
  if (existsSync(wsFile)) {
    list = JSON.parse(await fs.readFile(wsFile, "utf-8"));
  }
  if (list.find((w) => w.id === WS_ID)) {
    console.log(`• workspaces.json: conta "${WS_ID}" já cadastrada — não sobrescrevi`);
  } else {
    list.push({
      id: WS_ID,
      name: env.WS_NAME || handle,
      handle,
      igUserId,
      token,
      login: { username, ...hashPassword(password) },
      owner: true,
    });
    await fs.writeFile(wsFile, JSON.stringify(list, null, 2), "utf-8");
    console.log(`✓ workspaces.json: conta dona "${handle}" criada (login: ${username})`);
  }

  console.log("\nMigração concluída. 🎉");
}

main().catch((e) => {
  console.error("Erro na migração:", e);
  process.exit(1);
});
