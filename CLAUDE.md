# MeuChat

Ferramenta de automacao de Instagram (DMs e comentarios). Clone pessoal estilo ManyChat.

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Postgres) — schema em `supabase/schema.sql`
- Instagram API with Instagram Login (graph.instagram.com v23.0)

## Estrutura
- `app/page.tsx` — dashboard
- `app/editor/page.tsx` — editor de automacoes
- `app/api/webhook/route.ts` — recebe eventos da Meta
- `lib/engine.ts` — motor: evento → keyword match → executa acoes
- `lib/instagram.ts` — cliente da API do Instagram
- `lib/store.ts` — persistencia no Supabase

## Setup
Ver `SETUP.md` pro passo a passo completo.
