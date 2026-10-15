# DECO2850-team-project
DECO2850 team project exploring care-centred interaction design for university students balancing casual or part-time work with study, travel, income, rest and personal commitments.

## Project handbook

Explore the [Offshift wiki](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) for the demo walkthrough, design rationale, architecture, TDD workflow and deployment guide. The [wiki source](docs/wiki/README.md) is versioned with the code.

## Iteration 2 · Pleasure Framework pass

- [docs/pleasure-framework-iteration.md](docs/pleasure-framework-iteration.md): experience brainstorm, persona (Dinda) built from the five interviews, Four Pleasures mapping with psycho-pleasure applied, and the prototype update.
- [prototype/offshift.html](prototype/offshift.html): clickable prototype of Offshift with design notes beside each screen. Open it in a browser.

## Iteration 3 · Phone and iPad prototype

- [offshift-phone/](offshift-phone/): Next.js prototype with a phone (`/`), circular watch preview (`/watch`), daily reflection calendar (`/calendar`) and optional 3D week (`/calendar?view=3d`). Run with `cd offshift-phone && npm install && npm run dev` and open the Network URL on each device. See its [README](offshift-phone/README.md).
- [docs/offshift-console.md](docs/offshift-console.md): physical prototype spec for the Offshift Console.

## Watch and daily reflection

- [Circular watch preview](https://offshift-nine.vercel.app/watch): demo or unverified imported heart-rate readings, recording/source/import metadata, and Reading / Reflect screens.
- [Daily reflection calendar](https://offshift-nine.vercel.app/calendar): activities beside readings, optional browser-only reflections, and recovery time added only after preview and confirmation.
- [Watch integration guide](docs/wiki/Watch-and-Reflection.md): provisional file-import contract and the remaining native Garmin handoff. No live device connection is claimed.
- [Weekly contribution record](docs/contributions/2026-10-15-watch-reflection.md): commit links, TDD evidence and the demonstrated flow.

The optional 3D week is now at `/calendar?view=3d`; immersive mode stays at `/calendar?immersive=1`. Watch data stays outside the shared demo state.

## Production deployment

Offshift is deployed publicly at [offshift-nine.vercel.app](https://offshift-nine.vercel.app). The calendar is available at [offshift-nine.vercel.app/calendar](https://offshift-nine.vercel.app/calendar). Both URLs can be opened without a Vercel account.

| Setting | Value |
| --- | --- |
| Vercel project | `offshift` |
| Vercel scope | `andhikanayakaaws-projects` |
| Production branch | `main` |
| Root directory | `offshift-phone` |
| Framework | Next.js |
| Project ID | `prj_BDUHN455JgHcQ4TMgWTavA0LAbrJ` |
| Organisation ID | `team_PwjfmJ1cmiTuBCPFN6lQzVDb` |
| Production URL access | Public (verified without credentials) |

The deployment uses the existing Offshift logo at [`offshift-phone/src/app/icon.svg`](offshift-phone/src/app/icon.svg). Next.js publishes it as `/icon.svg`, which Vercel uses as the site's favicon/project artwork.

### Redeploy the same Vercel project

The repository connection was verified in Vercel: `main` is the production branch and `offshift-phone` is the root. `offshift-phone/vercel.json` explicitly enables Git deployments, so a push to `main` triggers a production deployment. GitHub Actions independently runs tests, type checking, a build and the standalone prototype checks; it is not a deployment gate. A collaborator can also deploy manually:

```bash
npm install --global vercel
cd offshift-phone
vercel login
vercel link --yes --project offshift --scope andhikanayakaaws-projects
vercel deploy --prod
```

The collaborator must first have access to both this GitHub repository and the `andhikanayakaaws-projects/offshift` project in Vercel. Access tokens are private credentials: create a separate token for each collaborator or CI service and never commit one to this repository or paste one into the README.

Before deploying, run the same checks used for this release:

```bash
cd offshift-phone
npm ci
npm test
npm run typecheck
npm run build
```

`ANTHROPIC_API_KEY` is optional; without it, the assistant uses its scripted fallback. The `/api/state` endpoint stores prototype state in process memory and the local filesystem, so state is not guaranteed to survive a Vercel serverless restart. Use a durable database before relying on it for production data.
