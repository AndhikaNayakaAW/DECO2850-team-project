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
| Access | Public prototype; `OFFSHIFT_ACCESS_CODE` is currently unset and optional |

## Current UI release · 27 October 2026

Pulled `main` through [`2e93548`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/2e93548), including reading dots, timed bar graphs, the new palette and simplified answers. Local release checks passed 230 web tests, 10 Garmin build checks, the standalone prototype tests, TypeScript and the production build. The [current screenshots](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/wiki/README.md#current-ui-screenshots) use an isolated local week with synthetic readings. Production verification must preserve the shared participant session.

A push of this release's README, images and wiki source triggers Vercel's production deployment. Confirm the matching commit and Ready state in [Vercel](https://vercel.com/andhikanayakaaws-projects/offshift), and the matching successful run in [GitHub validation](https://github.com/AndhikaNayakaAW/DECO2850-team-project/actions/workflows/validate.yml). The native menu changes require a separate watch build and installation.

## Previous verified release · 26 October

On 26 October 2026, `main` was pulled through [`a44c648`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/a44c648), including the plain-text shift-reading upload fix. Local checks passed: 225 web tests across 25 files, 10 Garmin build checks, the standalone prototype tests, TypeScript and the production build. Production configuration was checked: Node 24, root `offshift-phone`, Redis storage, and direct calendar access without a code. See Vercel's [production deployments](https://vercel.com/andhikanayakaaws-projects/offshift) and [GitHub validation](https://github.com/AndhikaNayakaAW/DECO2850-team-project/actions/workflows/validate.yml) for the deployment and CI status of each push.

The explicit [26 October production redeployment](https://vercel.com/andhikanayakaaws-projects/offshift/FRXoFGQjG8DuAK4Y8SKSaktSV1nT) reached **Ready** and was aliased to `offshift-nine.vercel.app`. The [source commit's GitHub validation](https://github.com/AndhikaNayakaAW/DECO2850-team-project/actions/runs/40187651710) also passed. Publishing the README and wiki source triggers a further Git deployment with the documentation commit.

### Earlier protected release · 19 October

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

If a pull removes routes and TypeScript still references them in `.next/types` or `.next/dev/types`, remove the generated `.next` folder, rebuild and rerun type checking. No source change is needed for stale generated route types.

## Redeploy and publish the handbook

Commit the updated source and README, then push `main` to trigger the production deployment. For an explicit rebuild of an existing deployment, first confirm that it contains the intended commit, then run:

```bash
vercel redeploy <deployment-url> --target production --scope andhikanayakaaws-projects
vercel inspect <new-deployment-url> --scope andhikanayakaaws-projects
```

Check `/calendar` and its immersive view, the `/team` and `/watch` redirects, and that `/api/state` reports Redis storage. Do not reset the live participant session as part of deployment verification. Garmin builds are installed separately.

The wiki is a separate Git repository. A main-repository push updates its source files but does not publish the wiki. From the repository root, run:

```bash
bash scripts/publish-wiki.sh --dry-run
bash scripts/publish-wiki.sh
```

## Server configuration

The server recognizes `KV_REST_API_URL` plus `KV_REST_API_TOKEN`, or `UPSTASH_REDIS_REST_URL` plus `UPSTASH_REDIS_REST_TOKEN`. The connected Vercel integration supplies the KV pair. Without Redis the app falls back to a development file; that fallback is not durable shared storage on Vercel.

Production currently opens without an access code. If `OFFSHIFT_ACCESS_CODE` is enabled, an HttpOnly cookie authorizes the browser after login and the watch uses the same code in its compiled route. Keep the code and private watch URL out of screenshots, source files and GitHub artifacts. Rotating or enabling the code requires a matching watch build and browser login. Removing it keeps older `/w/<code>/api/watch` addresses working, and old access-page links return to the calendar.

## Build the Garmin release

Set `OFFSHIFT_GARMIN_SDK` and `OFFSHIFT_GARMIN_KEY` to local paths outside the repository, then run from the repository root:

```bash
node offshift-watch/scripts/build.mjs \
  --access-code-file /private/path/production.env
```

The environment file must contain `OFFSHIFT_ACCESS_CODE=...`. Omit `--access-code-file` for the current public deployment. The builder defaults to the production origin and `fenix847mm`. It rejects HTTP release endpoints, copies resources and source to a temporary private directory, embeds the endpoint and keeps MIR/gen intermediates there, and removes that directory after compilation. Only the program and symbol file are published after a successful compilation. Only the public origin is printed. The binary is ignored and restricted to owner access.

Back up the installed Offshift app before copying the release into the watch's `GARMIN/Apps` using MTP. Do not modify firmware, activities or other apps. See the [native README](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/offshift-watch/README.md).

## Prototype limits

One deployment serves one shared session. A shared code is not separate participant accounts or employer/worker role authorization. The `/api/team` response hides private fields, but everyone with the shared code has access to the prototype's other routes. The free storage plan has quotas; automatic paid upgrades are disabled. No worker evaluation or clinical interpretation is established by these technical checks.
