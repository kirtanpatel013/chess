# Endgame — Online Chess

A real full-stack chess app: React + TypeScript + Tailwind frontend, Supabase
(Postgres + Auth + Realtime + Edge Functions) backend. This README is not
boilerplate — read the "What's actually solid vs. what to check" section
before you assume this is done.

## 0. What you need

- Node 18+
- A free Supabase account (https://supabase.com)
- The Supabase CLI (`npm install -g supabase`) — needed to deploy the Edge Function

## 1. Create the Supabase project

1. Create a new project at supabase.com.
2. In **Settings → API**, copy the **Project URL** and **anon public key**.
3. Copy `.env.example` to `.env` and paste those two values in.

## 2. Run the database migration

Open **SQL Editor** in the Supabase dashboard, paste the contents of
`supabase/migrations/0001_init.sql`, and run it. This creates:

- `profiles`, `rooms`, `games`, `moves` tables
- Row Level Security policies on all of them
- A trigger that auto-creates a `profiles` row on signup
- The `generate_room_code()` function
- Adds `rooms` to the `supabase_realtime` publication so postgres_changes
  events fire on updates

If you'd rather use the CLI: `supabase link --project-ref <ref>` then
`supabase db push`.

## 3. Deploy the Edge Function

This is the part that makes multiplayer trustworthy — it's the only thing
allowed to decide whose turn it is, whether a move is legal, and who won.

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy game-action
supabase secrets set SUPABASE_URL=https://<your-project-ref>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role key from Settings -> API>
```

Never put the service_role key in the frontend `.env` — it bypasses RLS
entirely and is meant to live only inside the Edge Function's environment.

## 4. Run it

```bash
npm install
npm run dev
```

Open two different browsers (or one normal + one incognito window), sign up
two accounts, and test Create Room / Join Room between them.

## 5. Deploy the frontend

Any static host works (Vercel, Netlify, Cloudflare Pages). Build command
`npm run build`, output directory `dist`, and set the same two
`VITE_SUPABASE_*` environment variables in the host's dashboard.

---

## What's actually solid vs. what to verify yourself

I wrote and type-checked all of this, and ran a real `tsc` + `vite build`
against the frontend — it compiles cleanly. What I could **not** do from
this sandbox: run a live Supabase project, so the realtime multiplayer path,
the Edge Function, and the RLS policies have **not** been exercised against
a real database. Test them yourself before trusting this in front of
anyone else. Specifically check:

- **Realtime updates**: confirm `postgres_changes` events actually arrive
  in both browser tabs after step 2 above ran the `alter publication`
  line. If you ran an older Supabase project that already had a
  `supabase_realtime` publication with different settings, that line can
  fail silently — check the Database → Replication tab in the dashboard.
- **RLS on `rooms`**: the direct-update policy is deliberately narrow
  (only lets a client join an open seat) because everything else goes
  through the Edge Function with the service role key. If you add any
  new direct-from-client writes to `rooms`, they need their own policy —
  don't assume the existing ones cover it.
- **Concurrency**: `join_room` and `move` both use conditional
  (`.is()` / `.eq('fen', ...)`) updates specifically to avoid two
  simultaneous requests corrupting a room. This is real but only
  spot-tested by reasoning through it, not load-tested.

## Deliberate simplifications (not oversights)

- **Rating system**: flat +12 / 0 / −10 per game, not real Elo. Swap the
  math in `updateProfileStats` inside the Edge Function for a proper
  Elo formula (expected score based on both ratings) before you call this
  a "rating."
- **AI**: alpha-beta minimax with piece-square tables, depth 1–3 depending
  on difficulty, no opening book, no quiescence search. It gets
  meaningfully stronger at higher difficulty but is not Stockfish-strength
  even on "Expert." Swapping in `stockfish.js` (WASM) as a Web Worker is a
  clean follow-up — the `chooseAIMove` interface in
  `src/lib/chessEngine.ts` is the only place that needs to change.
- **Avatars**: URL field, not a file upload. Wiring up Supabase Storage
  for actual image upload is maybe an hour of work if you want it.
- **Guest AI play**: works, but guest games aren't saved (there's no user
  to attach them to) — this matches the spec's "if practical" wording.
- **Reconnection**: works via re-fetching the room row on mount plus the
  realtime subscription; there's no "opponent disconnected" presence
  indicator, since Supabase Presence wasn't in the original schema and is
  a separate integration.

## Project structure

```
src/
  components/   Board, Piece (SVG, pure white/black), modals, cards
  hooks/        useAuth (session/profile), useRoom (realtime + actions)
  lib/          supabaseClient, chess AI, shared types
  pages/        one file per route
supabase/
  migrations/   SQL schema + RLS
  functions/    the game-action Edge Function (Deno)
```
