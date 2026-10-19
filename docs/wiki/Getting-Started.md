[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment) · [Watch & reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection) · [Weekly contribution](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution)

# Get started

The current app opens a dated 3D week calendar. Each participant starts with an empty week; the research team can explicitly load a practice week. The native Garmin app and the circular browser preview are separate experiences.

## Open the prototype

**[Calendar ↗](https://offshift-nine.vercel.app/calendar)** · **[Browser watch preview ↗](https://offshift-nine.vercel.app/watch)** · **[Daily reflection ↗](https://offshift-nine.vercel.app/calendar?view=day)**

Production requires the access code supplied privately by the project owner. The code is never published in the wiki. One deployment holds one shared session, so the research team runs one participant at a time.

| View | Route | Purpose |
| :--- | :--- | :--- |
| Main week | `/` or `/calendar` | Work, study, personal plans and waiting asks in the current week. |
| Daily reflection | `/calendar?view=day&date=YYYY-MM-DD` | A selected day's activities, optional notes and confirmed recovery blocks. |
| Browser watch | `/watch` | Circular preview with explicitly loaded demo readings or unverified file imports. |
| Research team | `/team` | New session, practice week, asks and replies. Not linked from the worker's screen. |
| Access | `/access` | Enter the deployment's shared access code. |

## Run locally

```bash
git clone https://github.com/AndhikaNayakaAW/DECO2850-team-project.git
cd DECO2850-team-project/offshift-phone
npm ci
npm run dev
```

Use Node 24, matching CI. For browser devices on the same Wi-Fi, use Next.js's printed Network URL. The local file store is suitable for development; the public Vercel deployment uses Redis.

## Try the complete interaction

Open `/team` and start a new session. Load the practice week only for a demonstration, or let the worker add their own commitments. Send an ask dated in the future. Read it on the calendar and on the Garmin, inspect the surrounding week, choose a reply and confirm sending. An accepted ask becomes a shift; the team page sees the reply.

On the watch, body sharing is optional. Declining keeps readings on the watch. When sharing is enabled, the server receives bands encoded as 0–3 and timestamps; raw physiological values stay on the watch. Turning sharing off removes the shared wearable record.

The phone and manager apps retained under `prototype/` are earlier course artifacts. They are not the main deployed interface. Camera and voice remain optional; normal touch and button controls work independently.

**Next:** [Watch and reflection](Watch-and-Reflection) · [Build and deploy](Deployment) · [Testing](Testing-and-TDD).
