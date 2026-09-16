# DECO2850-team-project
DECO2850 team project exploring care-centred interaction design for university students balancing casual or part-time work with study, travel, income, rest and personal commitments.

## Iteration 2 · Pleasure Framework pass

- [docs/pleasure-framework-iteration.md](docs/pleasure-framework-iteration.md): experience brainstorm, persona (Dinda) built from the five interviews, Four Pleasures mapping with psycho-pleasure applied, and the prototype update.
- [prototype/offshift.html](prototype/offshift.html): clickable prototype of Offshift with design notes beside each screen. Open it in a browser.

## Iteration 3 · Phone and iPad prototype

- [offshift-phone/](offshift-phone/): Next.js app with two synced screens: the phone (`/`, lock screen, apps page, manager page) and the full-screen 3D calendar for an iPad (`/calendar`). Run with `cd offshift-phone && npm install && npm run dev` and open the Network URL on each device. See its [README](offshift-phone/README.md).
- [docs/offshift-console.md](docs/offshift-console.md): physical prototype spec for the Offshift Console.

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

The repository is connected to the Vercel project, so a push to `main` creates a production deployment automatically. A collaborator can also deploy manually:

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
