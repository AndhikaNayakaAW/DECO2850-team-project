# DECO2850-team-project
DECO2850 team project exploring care-centred interaction design for university students balancing casual or part-time work with study, travel, income, rest and personal commitments.

## Project handbook

Explore the [Offshift wiki](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) for the demo walkthrough, design rationale, architecture, TDD workflow and deployment guide. The [wiki source](docs/wiki/README.md) is versioned with the code.

## Iteration 2 · Pleasure Framework pass

- [docs/pleasure-framework-iteration.md](docs/pleasure-framework-iteration.md): experience brainstorm, persona (Dinda) built from the five interviews, Four Pleasures mapping with psycho-pleasure applied, and the prototype update.
- [prototype/offshift.html](prototype/offshift.html): clickable prototype of Offshift with design notes beside each screen. Open it in a browser.

## Iteration 5 · A reflective tool (25 Oct 2026)

After the tutor's feedback, Offshift keeps three pieces and joins them: the **3D calendar**, a **one-press check-in** on the watch after each shift ("How was the work?": Light, Steady, Busy or Hard), and **heart rate and stress during each shift**, read by the watch for that shift's hours only and drawn down the shift as 15-minute grey cells. When a new ask arrives, a **Past shifts** check shows how the last shifts at that workplace went, in the worker's words and the watch's, with no advice. The all-day Body Battery reading, the daily floor band, the voice assistant and the second rating are gone. Rationale, storyboard, how this links to our interviews, the tutor's three questions and the user tests still to run: [docs/design/2026-10-25-biometrics-during-shifts.md](docs/design/2026-10-25-biometrics-during-shifts.md).

## Iteration 4 · Watch and calendar, ready for field testing

The phone mock-up and its demo story are gone. Offshift is now a Garmin watch app and a dated 3D week calendar that real workers can use in field tests.

- [offshift-phone/](offshift-phone/): the Next.js web app. The folder keeps its old name so the Vercel root directory and CI stay the same. It contains:
  - the 3D week at `/calendar`, which is the whole website (the `/team` console, `/watch` preview and daily reflection were removed on 23 Oct 2026).

  Run it with `cd offshift-phone && npm install && npm run dev` and open the Network URL on each device. Its [README](offshift-phone/README.md) explains how to run a field-testing session.
- [offshift-watch/](offshift-watch/README.md): the native Garmin fēnix 8 app, with a live connection to the calendar through `/api/watch`.
- [docs/offshift-console.md](docs/offshift-console.md): physical prototype spec for the Offshift Console.

## Garmin watch

- [Garmin watch app](offshift-watch/README.md): the native fēnix 8 app, with a live connection to the calendar through `/api/watch`: build, install, pages, what it reads, privacy and tests.

Immersive mode is at `/calendar?immersive=1`. The earlier browser watch preview and daily reflection are recorded in the [15 October contribution record](docs/contributions/2026-10-15-watch-reflection.md).

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

Before field testing on Vercel:

- **Connect an Upstash Redis database** to the project. The integration sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Without it, `/api/state` keeps the week only in one server instance's memory, so the calendar and the watch can drift apart and lose it on a restart.
- **Set `OFFSHIFT_ACCESS_CODE`.** The site is public, and participants' weeks shouldn't be.

See [offshift-phone/README.md](offshift-phone/README.md) for both.
