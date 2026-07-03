// Hash de senha com scrypt (node:crypto). Usado só em rotas server (Node runtime),
// nunca importado pelo middleware (que roda no edge).
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

/** Gera salt + hash pra uma senha nova. */
export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

/** Confere uma senha contra salt+hash guardados. */
export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const candidate = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}
