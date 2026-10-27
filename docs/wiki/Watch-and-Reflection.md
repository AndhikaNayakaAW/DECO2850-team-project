[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment) · [Watch & reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection) · [Weekly contribution](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution)

# Watch and reflection

**Focus:** Offshift is a reflective tool. The watch asks how the work was after each shift and reads heart rate and stress during it; the calendar shows both on the shift, and on every new ask at that workplace. This responds to the tutor's feedback (late October 2026) and remains a direction to test with workers. Rationale: [biometrics during shifts](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/design/2026-10-25-biometrics-during-shifts.md).

**[Week calendar ↗](https://offshift-nine.vercel.app/calendar)**

## Native Garmin experience

The teammate's native Garmin app is now in the repository. This release extends it with the calendar's cream ground, forest-green ink, warm accent, paper cards, scalable type and four page indicators. Small text uses dark semantic colours; native tests require at least 4.5:1 contrast against cream. Green native menus retain familiar watch controls.

<p align="center"><img src="https://raw.githubusercontent.com/AndhikaNayakaAW/DECO2850-team-project/main/docs/contributions/assets/garmin-ask-simulator.png" width="320" alt="Garmin simulator showing the cream Offshift Ask page, a synthetic Alex/Cafe ask, 4–9 pm and a Press to answer hint" /></p>

*Earlier Garmin simulator capture (19 October) with a synthetic ask. This is not a photograph of the physical watch or evidence of real sensor data.*

| Page | What the worker sees |
| :--- | :--- |
| Ask | Sender, workplace, date context and time; press to choose a reply. |
| Around it / Today | How the last shifts at that workplace went, then nearby commitments for an ask; or today's plans. |
| Last shift | The last shift the watch read: stress and heart in words. Press for where each comes from and the sharing switch. |
| Calendar | Last successful sync, waiting asks and the current sharing choice. |

Up/Down or a swipe moves between pages. Select opens the three answers (Accept, Decline, Decide later) on the first two pages and the last shift's details on the last two. Accept and Decline require confirmation; deciding later keeps the ask, marked "Saved for later". The answer menu now shows only each answer's name, without descriptions. No answer sends the manager a message. Failed sends retain the ask. Successful answers clear any old offline message.

## Connection and privacy

The current release targets Vercel's watch endpoint. The public prototype opens without a code; optional `OFFSHIFT_ACCESS_CODE` enables a protected route, and older installed code-prefixed routes remain compatible when the code is unset. Garmin Connect on the paired phone provides the communication bridge, and Redis holds the shared session. The laptop server and tunnel are no longer required by the deployed architecture.

Sharing is a worker choice. The watch reads only the hours of a finished shift, and the server receives one level (0–3) per 15 minutes for stress and for heart rate, never a raw value and nothing from outside a shift. Turning sharing off removes every shift's readings. The team projection does not contain body readings or private plans; shared-code access is still a prototype limitation, not separate employer accounts.

The words are an interaction representation of Garmin readings, not a diagnosis or evidence that work caused stress. Stress uses Garmin's own bands; heart rate is a share of the worker's own heart-rate reserve. Missing readings stay missing (hatched), never low.

## Reading the new calendar UI

The 3D block keeps the worker's violet work rating. A small blue dot appears only when at least one stress or heart sample is available; a shift containing only gaps has no dot. Hover or tap the block to see a timed graph, and use **Stress** or **Heart** beneath the week to choose the signal. Each 15-minute bar grows taller and darker on a yellow-green-blue ramp for a higher level. A missing sample is a short hatched stub. Summary sentences remain available to screen readers.

The day list, shift form and the ask's Past shifts rows use the same graphs. The ask shows the past-shift rows directly when available; its answers read **Accept**, **Decline** and **Decide later** without descriptions.

![Shift form with work rating and timed stress and heart graphs](https://raw.githubusercontent.com/AndhikaNayakaAW/DECO2850-team-project/main/docs/wiki/assets/2026-10-27-shift-detail.png)

*27 October capture from the local production build with synthetic readings.*

<p align="center"><img src="https://raw.githubusercontent.com/AndhikaNayakaAW/DECO2850-team-project/main/docs/wiki/assets/2026-10-27-ask-mobile.png" width="390" alt="Mobile ask showing past-shift graphs and Accept, Decline and Decide later" /></p>

*Mobile interface with the same synthetic local week; no real watch measurements.*

## Shift check-in and upload status

About 15 minutes after a shift ends, the watch asks **How was the work?** Choose **Light**, **Steady**, **Busy**, **Hard** or **Skip**. The calendar colours the shift from pale to dark violet; opening a finished shift lets the worker change its rating. No second body rating is collected.

With sharing enabled, the watch reads the finished shift's heart-rate and stress history and uploads one character per quarter hour: `0`–`3` for a level, `-` for missing. The server checks the shift's ID, time window and block count. The Last shift details show **Not sent yet**, **Saved on your calendar** or **Not saved yet (code)**. Rejected readings add a private log entry that the team projection omits. Failed connections back off; turning sharing off is retried until the calendar confirms removal.

The [upload-format fix](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/a44c648) must be built and installed on the fēnix 8 to use this format and status display. Redeploying Vercel updates only the web app and API. See the [native README](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/offshift-watch/README.md).

## Browser reflection removed

The circular browser preview (`/watch`) and the daily reflection (`/calendar?view=day`) were removed on 23 Oct 2026 to keep the website to one screen, the 3D week. Old `/watch` links open the week. When a browser that used them next opens the calendar, the reflections and imported readings they kept in that browser are deleted, since nothing is left to show or clear them. Their design and TDD evidence stays in the [15 October contribution record](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/contributions/2026-10-15-watch-reflection.md).

## What has been verified

On 27 October, 230 web tests, 10 build checks, TypeScript, the production build and standalone prototype tests passed. Local browser checks exercised the new hover graphs, signal switch, shift form, past shifts, answer labels and mobile layout with synthetic data. The latest native menu commit records 39 passing simulator tests; those were not rerun for this web deployment. This does not establish a physical upload of the new per-shift format.

Earlier, on 20 October, the paired phone enabled a verified physical round trip: a synthetic ask appeared on the watch, a confirmed Take it action produced one reply and one calendar shift, and available Garmin bands arrived. Synthetic artifacts were removed without clearing the then-current wearable record. At that time, 26 native tests, 200 web tests and nine build checks passed. A sensor-unavailable upload bug was reproduced and fixed; the corrected transfer matched the compiled readback hash. These results describe the earlier all-day-reading release.

For evaluation, ask workers what they want to understand, which view is easier, whether it supports a useful action and what feels uncomfortable. Technical tests do not establish reduced stress, medical meaning or improved reflection. A saved glance or an older Synced display alone does not prove a current connection.
