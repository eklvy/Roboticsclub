# Runtime audit — 2 November 2026

The audit covered the tracked application, server routes, validation/scoring engine, storage, configuration, migrations, tests, and setup documentation. Local page and session endpoints responded successfully. The existing browser mission had expired; starting a new mission succeeded. No browser console errors were present at inspection.

## Fixed

- Browser storage exceptions could stop the boot interval or throw from every sound/navigation click. Preferences now fall back to tab memory. Server-cookie progress remains authoritative.
- Failed session loading had no persistent recovery control. A visible connection banner now offers retry; registration/start controls wait for a valid session response.
- Network requests could keep registration and puzzle controls busy indefinitely. Client requests now time out after 15 seconds with actionable feedback. A timed-out mutation may have reached the server, so resume before retrying.
- Arrow-key navigation stopped after focusing a drone control button. It now works while buttons are focused, while preserving normal input/select/dialog behavior.
- Expired missions were labeled “Resume.” The main entry now offers “New mission” and goes directly to identification; completed missions offer their result.
- Independently bundled game/admin routes could race local read-modify-write transactions. An exclusive filesystem lock now covers each local transaction. A regression test verifies concurrent increments and lock cleanup on failure.
- Admin identity-validation failures could escape the JSON error handler. Authentication now runs inside the protected error boundary.
- Fresh-checkout type checking depended on generated Next.js files. The script now runs `next typegen` first. Development explicitly uses Webpack, matching the tested build pipeline.
- The boot interval kept scheduling after reaching 100%; it now stops.
- Live laser testing assumed the runner and server clock plus request latency would always fit the safe window. It now synchronizes with server time and verifies legitimate collision resets before bounded retries. Deterministic engine tests continue to check laser collisions separately.

## Verification

- Engine, runtime regressions, and full live HTTP escape tested.
- Browser: expired mission → fresh registration → pattern response → recovery password → four-digit keypad → next-sector unlock. Browser console inspected for errors.
- TypeScript and production build checked after changes.

## Remaining deployment limits

Hosted Supabase credentials were not supplied. Supabase Auth, Realtime, migration execution and multi-instance contention cannot be verified here. Local mode requires persistent writable storage. If a server crashes while holding `.data/event.lock`, stop all local game servers before removing that lock and restarting; do not remove a live server's lock. Public competition deployment still needs load testing and edge registration/login rate limits described in the README. GitHub is source hosting; pushing this repository alone does not deploy the running Next.js server.
