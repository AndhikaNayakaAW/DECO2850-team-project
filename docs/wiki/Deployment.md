[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment) · [Watch & reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection) · [Weekly contribution](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution)

# Deployment

A push to `main` automatically deploys the Next.js app through the existing Vercel Git integration. Garmin binaries are built and installed separately; a web deployment does not update a watch automatically.

| Setting | Current configuration |
| :--- | :--- |
| Vercel project | `andhikanayakaaws-projects / offshift` |
| Production URL | `https://offshift-nine.vercel.app` |
| Root directory | `offshift-phone` |
| Production branch | `main` |
| Shared storage | Upstash Redis resource `offshift-week`, connected to Production |
| Billing choice | Free plan; `autoUpgrade=false`, `prodPack=false` |
| Access | `OFFSHIFT_ACCESS_CODE`, stored as a Production secret |

## Verified release

The push of [`8b67263`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/8b67263) automatically produced a successful [production deployment](https://vercel.com/andhikanayakaaws-projects/offshift/E716bF3huNfhVXS4pnwA3jcwNNhB) and a successful [GitHub validation run](https://github.com/AndhikaNayakaAW/DECO2850-team-project/actions/runs/39259454484). No manual deployment command was needed for that release.

The live deployment passed 17 synthetic integration checks: access protection, a secure HttpOnly browser cookie, Redis storage, an ask read through the private watch route, concurrent duplicate answers, one accepted calendar shift, optional health bands, the team projection and deletion on sharing-off. The test session was cleared to an empty week. [Verification record](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/contributions/assets/garmin-production-verification-2026-10-19.json).

## Release checks

```bash
cd offshift-phone
npm ci
npm test
npm run typecheck
npm run build
cd ..
node --test offshift-watch/test/*.test.mjs
node --test prototype/offshift.logic.test.js
```

GitHub Actions runs these checks on main pushes and pull requests. Vercel deploys independently; CI is not a deployment approval gate. Confirm both statuses after a push.

## Server configuration

The server recognizes `KV_REST_API_URL` plus `KV_REST_API_TOKEN`, or `UPSTASH_REDIS_REST_URL` plus `UPSTASH_REDIS_REST_TOKEN`. The connected Vercel integration supplies the KV pair. Without Redis the app falls back to a development file; that fallback is not durable shared storage on Vercel.

Production browser routes require the shared access code. After login, an HttpOnly cookie authorizes the browser. The watch uses the same code in its dedicated watch route. Keep the code and private watch URL out of screenshots, chat reports, source files and GitHub artifacts. Rotating the code requires a new private watch build and a browser login.

## Build the Garmin release

Set `OFFSHIFT_GARMIN_SDK` and `OFFSHIFT_GARMIN_KEY` to local paths outside the repository, then run from the repository root:

```bash
node offshift-watch/scripts/build.mjs \
  --access-code-file /private/path/production.env
```

The environment file must contain `OFFSHIFT_ACCESS_CODE=...`. The builder defaults to the production origin and `fenix847mm`. It rejects HTTP release endpoints, copies resources and source to a temporary private directory, embeds the private endpoint there keeps MIR/gen intermediates there, and removes that directory after compilation. Only the program and symbol file are published after a successful compilation. Only the public origin is printed. The binary is ignored and restricted to owner access.

Back up the installed Offshift app before copying the release into the watch's `GARMIN/Apps` using MTP. Do not modify firmware, activities or other apps. See the [native README](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/offshift-watch/README.md).

## Prototype limits

One deployment serves one shared session. A shared code is not separate participant accounts or employer/worker role authorization. The `/team` response hides private fields, but everyone with the shared code has access to the prototype's other routes. The free storage plan has quotas; automatic paid upgrades are disabled. No worker evaluation or clinical interpretation is established by these technical checks.
