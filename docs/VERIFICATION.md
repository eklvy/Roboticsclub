# Verification record

Verified on 2 November 2026.

- Production webpack build and TypeScript checks pass.
- Ten engine tests pass. They exercise all 18 protocols, wrong responses, three-stage hint costs/caps, first-attempt scoring, sequential locks, disabled sectors, time expiry, circuit connectivity, both maze routes, laser collision, stateful terminal access, the final 12-second window, serialized resumption, leaderboard tie breaking, and frozen scoring rules.
- The live HTTP suite passed against the running local server: complete six-sector escape; HTTP-only/SameSite cookies; session isolation; rejected foreign origins; rejected locked stages; wrong answers and hints; fetch/resume; genuine standings; rejected unauthenticated/forged admin cookies; successful configured local admin authentication.
- Browser verification covered registration, map entry, incorrect response feedback, hints, correct progression, refresh/resume, locked rooms, and responsive visual inspection. Mobile map/puzzle/intro and desktop intro had no horizontal document overflow (measured CSS viewport widths 341 and 1295 pixels, plus the default panel width). All six levels were exercised through the live API; every individual puzzle was not manually replayed through browser controls.
- Installed dependency audit reported zero known vulnerabilities.
- Test operators remain in local practice standings. They are actual server-validated runs, not hardcoded examples.

Not verified without external credentials: hosted Supabase Auth, migration execution, cross-instance compare-and-swap under contention, and hosted Realtime delivery. No production deployment or event load test was performed. Use the README competition checklist before a public event.
