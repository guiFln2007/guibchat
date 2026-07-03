// Troca o login (usuário e/ou senha) de uma conta existente.
//
// Uso: node scripts/set-login.mjs --id <id> [--user <login>] [--pass <senha>]
//   ex: node scripts/set-login.mjs --id adspogere --pass NovaSenha
//       node scripts/set-login.mjs --id parceiro --user fulano@email.com --pass NovaSenha

import { promises as fs } from "fs";
import { existsSync } from "fs";
import path from "path";
import { scryptSync, randomBytes } from "crypto";

const WS_FILE = path.join(process.cwd(), "data", "workspaces.json");

function args() {
  const a = process.argv.slice(2);
  const o = {};
  for (let i = 0; i < a.length; i += 2) {
    if (a[i].startsWith("--")) o[a[i].slice(2)] = a[i + 1];
  }
  return o;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

async function main() {
  const o = args();
  if (!o.id || (!o.user && !o.pass)) {
    console.error("Uso: node scripts/set-login.mjs --id <id> [--user <login>] [--pass <senha>]");
    process.exit(1);
  }
  if (!existsSync(WS_FILE)) {
    console.error("data/workspaces.json não existe.");
    process.exit(1);
  }

  const list = JSON.parse(await fs.readFile(WS_FILE, "utf-8"));
  const ws = list.find((w) => w.id === o.id);
  if (!ws) {
    console.error(`Conta "${o.id}" não encontrada. Contas: ${list.map((w) => w.id).join(", ")}`);
    process.exit(1);
  }

  if (o.user) {
    const clash = list.find((w) => w.id !== o.id && w.login.username.toLowerCase() === o.user.toLowerCase());
    if (clash) {
      console.error(`Login "${o.user}" já é usado pela conta "${clash.id}".`);
      process.exit(1);
    }
    ws.login.username = o.user;
  }
  if (o.pass) {
    const { salt, hash } = hashPassword(o.pass);
    ws.login.salt = salt;
    ws.login.hash = hash;
  }

  await fs.writeFile(WS_FILE, JSON.stringify(list, null, 2), "utf-8");
  console.log(`✓ Conta "${o.id}" atualizada. Login: ${ws.login.username}${o.pass ? " · senha trocada" : ""}`);
}

main().catch((e) => {
  console.error("Erro:", e);
  process.exit(1);
});
