[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment) · [Watch & reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection) · [Weekly contribution](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution)

# Get started

The current app opens a dated 3D week calendar, and that calendar is the whole website. Each participant starts with an empty week. The native Garmin app shows the same week and asks.

## Open the prototype

**[Calendar ↗](https://offshift-nine.vercel.app/calendar)**

Production requires the access code supplied privately by the project owner. The code is never published in the wiki. One deployment holds one shared session, so the research team runs one participant at a time.

| View | Route | Purpose |
| :--- | :--- | :--- |
| Main week | `/` or `/calendar` | Work, study, personal plans and waiting asks in the current week. **Test offer** sends a sample ask. |
| New session | `/calendar?reset=1` | Empties the shared week on every open calendar before the next participant. |
| Immersive week | `/calendar?immersive=1` | The wide, hands-free week. |
| Access | `/access` | Enter the deployment's shared access code. |

The research console (`/team`), the browser watch preview (`/watch`) and the daily reflection (`?view=day`) were removed on 23 Oct 2026. Old `/team` and `/watch` links open the week.

## Run locally

```bash
git clone https://github.com/AndhikaNayakaAW/DECO2850-team-project.git
cd DECO2850-team-project/offshift-phone
npm ci
npm run dev
```

Use Node 24, matching CI. For browser devices on the same Wi-Fi, use Next.js's printed Network URL. The local file store is suitable for development; the public Vercel deployment uses Redis.

## Try the complete interaction

Open `/calendar?reset=1` to start a new session, and let the worker add their own commitments. Press **Test offer** to send an ask dated in the future. Read it on the calendar and on the Garmin, inspect the surrounding week, choose a reply and confirm sending. An accepted ask becomes a shift.

On the watch, body sharing is optional. Declining keeps readings on the watch. When sharing is enabled, the server receives bands encoded as 0–3 and timestamps; raw physiological values stay on the watch. Turning sharing off removes the shared wearable record.

The phone and manager apps retained under `prototype/` are earlier course artifacts. They are not the main deployed interface. Camera and voice remain optional; normal touch and button controls work independently.

**Next:** [Watch and reflection](Watch-and-Reflection) · [Build and deploy](Deployment) · [Testing](Testing-and-TDD).
