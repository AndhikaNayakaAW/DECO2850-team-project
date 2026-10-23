[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment) · [Watch & reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection) · [Weekly contribution](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution)

# Watch and reflection

**Proposed focus:** Offshift helps casual workers reflect on how work fits with their energy, rest and other commitments. This responds to tutor feedback and remains a direction to test with workers.

**[Week calendar ↗](https://offshift-nine.vercel.app/calendar)**

## Native Garmin experience

The teammate's native Garmin app is now in the repository. This release extends it with the calendar's cream ground, forest-green ink, warm accent, paper cards, scalable type and four page indicators. Small text uses dark semantic colours; native tests require at least 4.5:1 contrast against cream. Green native menus retain familiar watch controls.

<p align="center"><img src="https://raw.githubusercontent.com/AndhikaNayakaAW/DECO2850-team-project/main/docs/contributions/assets/garmin-ask-simulator.png" width="320" alt="Garmin simulator showing the cream Offshift Ask page, a synthetic Alex/Cafe ask, 4–9 pm and a Press to answer hint" /></p>

*Garmin simulator capture with a synthetic ask. This is not a photograph of the physical watch or evidence of real sensor data.*

| Page | What the worker sees |
| :--- | :--- |
| Ask | Sender, workplace, date context and time; press to choose a reply. |
| Around it / Today | Nearby commitments for an ask, or today's plans. |
| Body | Available body words; press for values and sources on the watch. |
| Calendar | Last successful sync, waiting asks and the current sharing choice. |

Up/Down or a swipe moves between pages. Select opens the three answers (Accept, Decline, Decide later) on the first two pages and body details on the last two. Accept and Decline require confirmation; deciding later keeps the ask, marked "Saved for later". No answer sends the manager a message. Failed sends retain the ask. Successful answers clear any old offline message.

## Connection and privacy

The private release targets the protected Vercel watch endpoint. Garmin Connect on the paired phone provides the communication bridge, and Redis holds the shared session. The laptop server and tunnel are no longer required by the deployed architecture.

Sharing is a worker choice. The server receives timestamped bands encoded 0–3, not raw heart rate, Body Battery or other physiological values. Turning sharing off removes the shared wearable record. The team projection does not contain body readings or private plans; shared-code access is still a prototype limitation, not separate employer accounts.

Body words are an interaction representation of available Garmin readings, not a diagnosis or evidence that work caused stress. “Sleep” is an overnight Body Battery recharge proxy, not Garmin's sleep score. Missing readings stay missing.

## Browser reflection removed

The circular browser preview (`/watch`) and the daily reflection (`/calendar?view=day`) were removed on 23 Oct 2026 to keep the website to one screen, the 3D week. Old `/watch` links open the week. When a browser that used them next opens the calendar, the reflections and imported readings they kept in that browser are deleted, since nothing is left to show or clear them. Their design and TDD evidence stays in the [15 October contribution record](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/contributions/2026-10-15-watch-reflection.md).

## What has been verified

On 20 October the paired phone enabled a verified physical round trip: a synthetic ask appeared on the watch, a confirmed Take it action produced one reply and one calendar shift, and available Garmin bands arrived. Synthetic artifacts were removed without clearing the wearable record. All 26 native tests, 200 web tests and nine build checks pass. A sensor-unavailable upload bug was reproduced and fixed; the corrected transfer matches the compiled readback hash.

For evaluation, ask workers what they want to understand, which view is easier, whether it supports a useful action and what feels uncomfortable. Technical tests do not establish reduced stress, medical meaning or improved reflection. A saved glance or an older Synced display alone does not prove a current connection.
