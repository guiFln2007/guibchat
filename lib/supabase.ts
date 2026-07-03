// Cliente Supabase — server-only (usa a SECRET key, que ignora RLS).
// NUNCA importar isto no middleware (edge) nem em componente client.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  throw new Error(
    "SUPABASE_URL e SUPABASE_SECRET_KEY são obrigatórios no .env (ou nas env vars da Vercel).",
  );
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
