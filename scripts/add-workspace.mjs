// Adiciona uma nova conta (workspace) ao Gobchat.
//
// Uso:
//   node scripts/add-workspace.mjs --id <id> --name "Nome" --handle <igHandle> \
//        --igUserId <igUserId> --token <tokenLongLived> \
//        --user <login> --pass <senha>
//
// O <id> vira o nome da pasta de dados (data/accounts/<id>/) — use kebab-case, estável.
// O parceiro precisa autorizar o app "AutoDM Pogere" e gerar o token long-lived dele.

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
  const required = ["id", "name", "handle", "igUserId", "token", "user", "pass"];
  const missing = required.filter((k) => !o[k]);
  if (missing.length) {
    console.error("Faltou: " + missing.map((m) => "--" + m).join(", "));
    console.error(
      '\nEx: node scripts/add-workspace.mjs --id parceiro --name "Fulano" --handle fulano ' +
        "--igUserId 1784100000 --token IGAA... --user fulano@email.com --pass SenhaForte",
    );
    process.exit(1);
  }

  let list = [];
  if (existsSync(WS_FILE)) list = JSON.parse(await fs.readFile(WS_FILE, "utf-8"));

  if (list.find((w) => w.id === o.id)) {
    console.error(`Já existe uma conta com id "${o.id}".`);
    process.exit(1);
  }
  if (list.find((w) => w.igUserId === o.igUserId)) {
    console.error(`Já existe uma conta com esse IG User ID.`);
    process.exit(1);
  }
  if (list.find((w) => w.login.username.toLowerCase() === o.user.toLowerCase())) {
    console.error(`Já existe uma conta com esse login "${o.user}".`);
    process.exit(1);
  }

  list.push({
    id: o.id,
    name: o.name,
    handle: o.handle.replace(/^@/, ""),
    igUserId: o.igUserId,
    token: o.token,
    login: { username: o.user, ...hashPassword(o.pass) },
    owner: false,
  });

  await fs.mkdir(path.dirname(WS_FILE), { recursive: true });
  await fs.writeFile(WS_FILE, JSON.stringify(list, null, 2), "utf-8");
  await fs.mkdir(path.join(process.cwd(), "data", "accounts", o.id), { recursive: true });

  console.log(`✓ Conta "${o.name}" (@${o.handle}) criada. Login: ${o.user}`);
  console.log("  Pasta de dados: data/accounts/" + o.id + "/");
}

main().catch((e) => {
  console.error("Erro:", e);
  process.exit(1);
});
