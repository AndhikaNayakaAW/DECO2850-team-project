# Offshift · calendar and watch

Offshift helps students who work casual shifts answer a shift ask on their own terms. When a manager asks "can you cover tonight?", the ask lands on the worker's week, in 3D, and on their Garmin watch, next to their classes, plans and rest days, and beside how their last shifts at that workplace went: their own word for each, and their heart rate and stress during it. The worker chooses one of three answers: Accept puts the shift on their week, Decline takes the ask off it, and Decide later keeps it on the week, see-through, to decide when they are ready. No message is sent to the manager.

## What's here

- **`/calendar`** is the worker's week in 3D and the main screen. It works on a phone, an iPad or a laptop.
  - **+ Add**, or **+ Add to {day}** in the side panel, adds a shift, class, due date or plan. Tap anything in the side panel to change or delete it. A deletion can be undone for a few seconds.
  - **‹ Today ›** moves between weeks, and the arrow keys move the day.
  - **In the 3D week**, drag to turn it and pinch or scroll to zoom. Hold a block still for a moment to pick it up. You can then move a plan to another day, or drop anything on the bin to remove it, and Undo is offered either way. A quick swipe only ever turns the view. Throwing an ask away opens it with Decline pointed out; nothing changes until you press it.
  - A waiting ask shows as an amber block, in the side list and as a pill in the header. Open it to see the Body, Week and Past shifts checks and press Accept, Decline or Decide later. Accept and Decline offer Undo for a few seconds. An ask kept for later stays on the week as a see-through block; press it to decide.
  - **A blue dot** marks a shift with at least one available watch reading. Its block keeps the violet work rating. Hover or tap it for a bar graph with the shift's start, hour marks and end. **Stress** and **Heart** below the week switch the graph. The day list, shift form and ask's past shifts use the same bars: one per 15 minutes, taller and darker for more, hatched for missing samples. Summary sentences remain in accessible graph labels.
  - **⚙** opens settings: first name, days kept clear, and what counts as a late finish.
  - **Test offer** sends a sample ask, as a manager would. It reaches the calendar and the watch.
  - **Immersive** opens the wide, hands-free week (`/calendar?immersive=1`), described below.
- **`/api/state`** holds the shared week, and **`/api/watch`** is the watch's door. **`/api/team`** takes the asks that Test offer sends and returns the manager's view of the week, which never includes body readings, plans or private notes.

The calendar is the whole website. The research console (`/team`), the browser watch preview (`/watch`) and the daily reflection (`?view=day`) were removed on 23 Oct 2026; old links to `/team` and `/watch` open the week. The voice assistant was removed the same day: Offshift never speaks or listens.

## Current UI screenshots

[Week and reading dots](../docs/wiki/assets/2026-10-27-calendar-desktop.png) · [Stress on hover](../docs/wiki/assets/2026-10-27-calendar-hover-stress.png) · [Heart on hover](../docs/wiki/assets/2026-10-27-calendar-hover-heart.png) · [Shift detail](../docs/wiki/assets/2026-10-27-shift-detail.png) · [Ask](../docs/wiki/assets/2026-10-27-ask-desktop.png) · [Mobile ask](../docs/wiki/assets/2026-10-27-ask-mobile.png). All use synthetic local data captured on 27 October.

## Run it

```bash
cd offshift-phone
npm install
npm run dev
```

The terminal prints a Network URL such as `http://192.168.1.20:3000`. Open `…/calendar` on the worker's phone, iPad or laptop. All devices must be on the same Wi-Fi. On iOS, Add to Home Screen gives a full-screen app.

## Running a field-testing session

1. Open `/calendar?reset=1` to start a new session. Every open calendar empties. The participant can enter their first name in **⚙**; it is used in a test ask's message, and is optional.
2. The participant adds their real week on `/calendar`.
3. Press **Test offer** to send an ask. The calendar polls every two seconds with Redis; the watch polls every five seconds while open. Delivery also depends on the paired phone's connection.
4. The participant answers on the calendar or on the watch.
5. Open `/calendar?reset=1` again before the next participant.

One running server holds one shared week. Anyone who opens the same server sees it, so run one session at a time and start a new one between participants.

## Dates and time

Everything is dated in the worker's time zone: Australia/Brisbane by default (`settings.timeZone`). The calendar shows the real current week and moves to the next week by itself. "Tonight" means an ask that starts at 4 pm or later today. A shift whose finish is earlier than its start runs past midnight.

## Sync and storage

Every open page polls `/api/state`, every second or every two seconds with Redis, and merges changes three ways. Edits from the calendar and the watch then don't overwrite each other, even when two arrive at once. Where the week is stored:

- **Upstash Redis or Vercel KV**, when `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set (or `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`). Use this on Vercel.
- **A file** otherwise: `.offshift-state.json` in this folder, or the path in `OFFSHIFT_STATE_FILE`.

A serverless host such as Vercel doesn't keep files, so it needs Redis.

## Access code

The current public prototype opens without a code. To restrict a deployment, set the optional `OFFSHIFT_ACCESS_CODE`. Only people who enter that code can then open Offshift or its API, and each browser remembers the code for 60 days. The watch can't type, so its compiled server address carries the code: `https://<your-site>/w/<code>`.

Without the variable nothing asks for a code, and older installed `/w/<code>/api/watch` addresses still reach the watch API. If a code is enabled or changed, browsers must enter it and the watch must be rebuilt and installed with the matching endpoint. This does not create separate participant or employer accounts.

## Garmin watch app

The Garmin app in [`offshift-watch`](../offshift-watch/README.md) runs on a fēnix 8 and uses `/api/watch`:

- it fetches the waiting ask with its week lines and today's plans;
- it sends the worker's answer;
- about 15 minutes after a shift ends, it asks how the work was (Light, Steady, Busy, Hard or Skip), once, and the answer colours that shift on the calendar from pale to dark violet, with the word on the block and a legend. A finished shift can also be rated or changed by tapping it on the calendar. It is a shift's only rating and never reaches `/api/team`. Rationale and sources: [docs/design/2026-10-23-shift-check-in.md](../docs/design/2026-10-23-shift-check-in.md);
- at the same time, and only if the worker agreed on the watch, it reads its own history for that shift's hours and sends heart rate and stress as one level from 0 to 3 per 15 minutes, never a number: Garmin's stress bands (resting, low, medium, high), and heart rate as a share of the worker's own heart-rate reserve (very light, light, moderate, vigorous).

Offshift reads the body only during shifts. The calendar keeps each shift's blocks on that shift, marks their availability with a blue dot in the 3D week, and shows timed bar graphs on hover, tap and in the lists, and uses them in the Past shifts check when a new ask arrives at the same workplace. Turning sharing off on the watch clears every shift's readings. Nothing about the body or the ratings reaches `/api/team` or an employer. Why it works this way: [docs/design/2026-10-25-biometrics-during-shifts.md](../docs/design/2026-10-25-biometrics-during-shifts.md).

The current upload format uses one character per 15-minute block: `0`–`3` for a level and `-` for a missing reading. The API also accepts lists. It checks the shift's ID, time window and block count before saving. A refused reading adds a private log entry; the watch's Last shift details say **Saved on your calendar** or **Not saved yet (code)**. Sharing-off is retried until the server confirms deletion.

A real watch only talks to https. For local testing, run `npm run watch-gateway`, which forwards `/api/watch` and nothing else on port 3001, and point a tunnel at it, for example `cloudflared tunnel --url http://127.0.0.1:3001`. A deployed https site such as Vercel needs no gateway. The release endpoint is compiled in: follow the [native build and installation guide](../offshift-watch/README.md) to change it or install the current shift-reading features. A Vercel deployment does not update the watch binary.

## Phone calendars

Offshift doesn't read or write the phone's own calendar (Apple Calendar, Google Calendar or Outlook). The worker's week is entered in Offshift. A read-only calendar subscription could be added later if the team wants one.

## Immersive view

**Immersive** opens a wide 16:9 layout:

- a gesture guide on the left;
- the detailed week in the centre, where every block shows its title, time, category and status, and quiet-hour boundaries are drawn;
- the selected block on the right;
- captions along the bottom, shown on screen and never spoken.

Every gesture has a button as well, and **Use touch controls** gives large touch buttons.

Hand tracking is optional. It uses MediaPipe Hand Landmarker served from `public/mediapipe`, so no internet is needed. Turning the camera on asks for consent first. Video is processed in the browser and nothing is saved. Only hand positions are read: no faces, identity or expressions.

| Gesture | What it does |
| --- | --- |
| Both palms open | Separates the week into layers |
| Both hands closed | Combines the layers again |
| Hands apart or together | Zooms |
| Both hands move | Rotates and tilts the week |
| Pinch | Selects a block |
| Pinch and drag | Previews a move, snapped to 15 minutes |
| Pinch and hold empty space | Starts a new event |
| Thumbs up | Confirms |
| Thumbs down | Cancels |
| A held fist | Undoes |

Nothing changes without a confirmation. Rostered shifts never move here: a dragged shift snaps back, and nothing goes to the manager.

## Tests

```bash
npm test            # unit tests (vitest)
npm run typecheck
npm run build
```

The tests cover dates and weeks, the Body, Week and Past shifts checks, the three answers and team actions, the three-way merge, the watch summary, the check-in and each shift's readings, the API routes and the store.

On 27 October 2026, all **230 tests across 25 files**, TypeScript and the production build passed. If type checking after a pull still references removed routes under `.next`, remove the generated `.next` folder and run `npm run build` followed by `npm run typecheck`.
