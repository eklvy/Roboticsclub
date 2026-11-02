# ROBO–LOCKDOWN

A six-sector, 18-protocol robotic escape room built with Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, Lucide, Zod, and Supabase. The interface uses a custom procedural SVG facility, responsive interactive puzzles, synthesized audio, and reduced-motion support.

## Run locally

Use Node 22 LTS or newer.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. No Supabase credentials are required for practice. Configure `LOCAL_ADMIN_PASSWORD` with a strong random value (for example, generate one with `openssl rand -hex 32`), restart the server, then sign in at `/admin`. Local admin is disabled when this variable is empty; there is no default password.

Local practice saves authoritative sessions in `.data/event.json` using atomic file replacement. The browser keeps a small localStorage resume snapshot and an HTTP-only session cookie. Scores and progression always come from the server. Refreshing resumes a mission; deleting the cookie loses access to that mission. The real-time clock continues while the browser is closed. Use exactly one server process in local mode; local filesystem storage is unsuitable for ephemeral/serverless or multi-instance deployment.

## Play

1. Read the mission brief and identify your operator.
2. Solve three protocols per sector, collecting a fragment after each of the first five sectors.
3. Use the field journal for the final multi-step escape. The overall timer defaults to 60 minutes; the final release has a separate 12-second window.
4. Hints have three stages and cost points. Incorrect attempts cost points. Completing a protocol, sector, or a protocol on the first attempt earns points. Escaping adds a remaining-time bonus.
5. Completed rooms can be revisited to inspect the secured record; they cannot be farmed for points. A new run can be started after escape or timeout. Administrators can reset a run while preserving its browser identity.

`/game` opens the resume/map flow. `/leaderboard` shows actual records, including in-progress missions. Equal scores rank by elapsed time and then hints. Local standings refresh every ten seconds. Competition standings also subscribe to Supabase Realtime revision notifications.

## Competition deployment (Supabase + Node hosting)

1. Create a Supabase project. Apply `supabase/migrations/001_event.sql` through its SQL editor or migration tooling. This enables RLS on private event state and a public revision-only notification table. Never make `event_state` publicly readable.
2. Create administrator users in Supabase Auth. Set `ADMIN_EMAILS` to the explicit comma-separated email allowlist. Do not enable open administrator registration.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the **server-only** `SUPABASE_SERVICE_ROLE_KEY` in your hosting provider. Never prefix the service key with `NEXT_PUBLIC_`. Set `ADMIN_EMAILS` on the server.
4. Deploy to a Next.js-capable Node host (for example Vercel or a Node 22 container). Run `npm run build` and `npm start` for a persistent Node host. Use HTTPS and preserve the public origin/Host through your reverse proxy; mutation endpoints enforce matching Origin.
5. Sign in at `/admin`, configure timer/scoring, enable the six sectors, and run a pilot mission before the event. Scoring and timer changes apply only to new missions; disabling sectors applies immediately and does not pause active clocks.
6. Verify standings receive revision events. A ten-second polling fallback remains active if Realtime is unavailable.
7. Export results as CSV before resetting the event. Reset is destructive and requires typing `RESET EVENT`.

Supabase mode refuses to fall back to local files when the database is unreachable. Misconfigured credentials return a visible error. No credentials or deployments are provisioned automatically by this repository.

## Integrity and operational scope

Puzzle solutions and hints live in `src/lib/server/engine.ts`, imported only by server routes. The client receives public puzzle evidence and previously earned answers, not future solutions. Server timestamps, immutable per-session rules, strict sequential progression, and authenticated session cookies determine completion and scoring. Live laser actions are evaluated on the server, including collision timing; latency can affect the timing challenge.

Sessions use 256-bit random bearer cookies, with only SHA-256 hashes stored. Admin routes validate Supabase Auth identities against the allowlist; local admin tokens are HMAC-signed, expire after an hour, and are never enabled by default. Mutations enforce same-origin requests. Zod validates inputs. Accepted player actions are limited to one per 180 ms per session. Admin login has a per-process attempt limiter, plus Supabase Auth rate limits in competition mode. CSV output neutralizes formula prefixes.

The Supabase event store uses a private JSONB aggregate with version-based compare-and-swap for atomic score/progression updates across instances. A separate revision table avoids broadcasting private state. This is a small-event architecture, not a large-scale tournament backend: load-test your expected concurrency. For a public university event, add an edge/IP rate limit for registration, API traffic, and login, and enforce roster/invitation checks if one registration per student is required. Browser sessions are not proof of student identity; additional browsers can register again. Provision backups and test the expected audience before using it competitively. Public standings expose operator/team names by design; avoid entering sensitive information as a callsign.

“Recently playing” means a player acted within the last 60 seconds; “active missions” means the timer has not expired. Admin monitoring refreshes every 15 seconds. Local admin brute-force tracking is process-local; production edge limits are needed across instances. This project deliberately has no client-side admin bypass or default password.

## Checks

```sh
npm run typecheck
npm test
npm run build
```

The engine tests cover all 18 protocols, invalid answers, penalties and hint caps, locked/disabled sectors, timers, circuit topology, robot paths, laser collision, stateful terminal commands, final timing, serialization/resume, ranking, and per-session rule snapshots.

For live HTTP checks with the dev server running:

```sh
TEST_BASE_URL=http://localhost:3000 npm test
```

The HTTP suite creates a practice operator and verifies cookies, resumption, isolated sessions, origin checks, locks and protected admin endpoints. Its records remain visible in local standings until reset.

## Architecture

- `src/components/Game.tsx`: cinematic intro, identification, map, mission HUD, journal, endings, standings.
- `src/components/Puzzle.tsx`: 18 interactive challenge views.
- `src/components/Scene.tsx`: procedural facility illustration.
- `src/data/levels.ts`: public narrative, evidence, and maze geometry.
- `src/lib/server/engine.ts`: authoritative validation, progression, hints and scoring.
- `src/lib/server/store.ts`: atomic local persistence and Supabase optimistic concurrency.
- `src/app/api/game/route.ts`: session and gameplay API.
- `src/app/api/admin/route.ts`: protected operations and configuration API.
- `supabase/migrations/001_event.sql`: RLS-protected persistence and Realtime signal.

Sound starts muted and requires user opt-in. All maze controls support touch; manual navigation also supports arrow keys when focus is outside an input/button. Reduced-motion OS preferences suppress decorative animation.

## Troubleshooting local startup

The tested development command uses Webpack. `npm run typecheck` generates Next.js route types automatically, including on a fresh checkout. If browser storage is blocked, preferences stay in tab memory and gameplay still uses the server session cookie. A failed session connection shows **Retry connection**. Client requests time out after 15 seconds; if a submission times out, refresh/resume before retrying because the server may already have saved it.

An expired mission offers **New mission** on the opening screen. Local game/admin writes use `.data/event.lock` to prevent overlapping saves. If a server crashes and leaves this lock behind, stop all game server processes before removing the lock and restarting. Never remove it while a server is saving.

See `docs/AUDIT.md` for the runtime audit and remaining hosted-deployment checks.
