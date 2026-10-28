[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment) · [Watch & reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection) · [Weekly contribution](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution)

# Get started

The current app opens a dated 3D week calendar, and that calendar is the whole website. Each participant starts with an empty week. The native Garmin app shows the same week and asks.

## Open the prototype

**[Calendar ↗](https://offshift-nine.vercel.app/calendar)**

The public prototype currently opens directly, without an access code. A deployment can optionally enable `OFFSHIFT_ACCESS_CODE`; only then is a private code required. One deployment holds one shared session, so the research team runs one participant at a time.

| View | Route | Purpose |
| :--- | :--- | :--- |
| Main week | `/` or `/calendar` | Work, study, personal plans and waiting asks in the current week. **Test offer** sends a sample ask. |
| New session | `/calendar?reset=1` | Empties the shared week on every open calendar before the next participant. |
| Optional access | `/access` | Enter a code if enabled; otherwise redirects to the calendar. |

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

Open `/calendar?reset=1` to start a new session, and let the worker add their own commitments. Press **Test offer** to send an ask dated in the future. Read it on the calendar and on the Garmin, inspect the surrounding week, and choose Accept, Decline or Decide later. An accepted ask becomes a shift.

After a finished shift, the worker can rate the work **Light**, **Steady**, **Busy** or **Hard**, or skip. The watch prompts about 15 minutes after the shift; a completed shift can also be rated or changed on the calendar. This is the shift's only rating.

On the watch, body sharing is optional. When enabled, the watch reads only the finished shift's hours and sends one level per 15 minutes for stress and heart rate. Raw values stay on the watch. A strip of 15-minute cells runs down each shift the watch read; use the **Stress** and **Heart** buttons under the week to switch between them, and hover or tap a shift for a one-line summary. Cells grow darker on a yellow-green-blue scale. The day list shows the same readings as bars with start, hour and finish times underneath. Missing readings are hatched. Open another ask at the same workplace to compare **Past shifts**. Turning sharing off removes every shift's readings.

The watch's Last shift details show whether the upload was saved. The current native build must be installed separately; updating the website does not install it. The calendar polls every two seconds with Redis, and the watch every five seconds while open, subject to the paired phone's connection.

The phone and manager apps retained under `prototype/` are earlier course artifacts. They are not the main deployed interface. The camera remains optional, and Offshift never speaks or listens; normal touch and button controls work independently.

![Current ask with past-shift graphs and the three answer labels](https://raw.githubusercontent.com/AndhikaNayakaAW/DECO2850-team-project/main/docs/wiki/assets/2026-10-27-ask-desktop.png)

*27 October capture with synthetic local data. The mobile view is in the [screenshot gallery](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/wiki/README.md#current-ui-screenshots).*

**Next:** [Watch and reflection](Watch-and-Reflection) · [Build and deploy](Deployment) · [Testing](Testing-and-TDD).
