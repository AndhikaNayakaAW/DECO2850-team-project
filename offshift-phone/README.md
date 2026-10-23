# Offshift · calendar and watch

Offshift helps students who work casual shifts answer a shift ask on their own terms. When a manager asks "can you cover tonight?", the ask lands on the worker's week, in 3D, and on their Garmin watch, next to their classes, plans, rest days and how tired they are. The worker chooses one of three answers: Accept puts the shift on their week, Decline takes the ask off it, and Later keeps it on the week, see-through, to decide when they are ready. No message is sent to the manager.

## What's here

- **`/calendar`** is the worker's week in 3D and the main screen. It works on a phone, an iPad or a laptop.
  - **+ Add**, or **+ Add to {day}** in the side panel, adds a shift, class, due date or plan. Tap anything in the side panel to change or delete it. A deletion can be undone for a few seconds.
  - **‹ Today ›** moves between weeks, and the arrow keys move the day.
  - **In the 3D week**, drag to turn it and pinch or scroll to zoom. Hold a block still for a moment to pick it up. You can then move a plan to another day, or drop anything on the bin to remove it, and Undo is offered either way. A quick swipe only ever turns the view. Throwing an ask away opens a drafted "no", and nothing reaches the manager until you press Send.
  - A waiting ask shows as an amber block, in the side list and as a pill in the header. Open it to see the Body and Week checks and press Accept, Decline or Later. Accept and Decline offer Undo for a few seconds. An ask kept for later stays on the week as a see-through block; press it to decide.
  - **⚙** opens settings: first name, days kept clear, and what counts as a late finish.
  - **Test offer** sends a sample ask, as a manager would. It reaches the calendar and the watch.
  - **Immersive** opens the wide, hands-free week (`/calendar?immersive=1`), described below.
- **`/api/state`** holds the shared week, **`/api/watch`** is the watch's door, and **`/api/assistant`** is the voice assistant. **`/api/team`** takes the asks that Test offer sends and returns the manager's view of the week, which never includes body readings, plans or private notes.

The calendar is the whole website. The research console (`/team`), the browser watch preview (`/watch`) and the daily reflection (`?view=day`) were removed on 23 Oct 2026; old links to `/team` and `/watch` open the week.

## Run it

```bash
cd offshift-phone
npm install
npm run dev
```

The terminal prints a Network URL such as `http://192.168.1.20:3000`. Open `…/calendar` on the worker's phone, iPad or laptop. All devices must be on the same Wi-Fi. On iOS, Add to Home Screen gives a full-screen app.

## Running a field-testing session

1. Open `/calendar?reset=1` to start a new session. Every open calendar empties. The participant can enter their first name in **⚙**; it is used in greetings, and is optional.
2. The participant adds their real week on `/calendar`.
3. Press **Test offer** to send an ask. It reaches the calendar and the watch within about two seconds.
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

On a public deployment, set `OFFSHIFT_ACCESS_CODE`. Only people who enter that code can then open Offshift or its API, and each browser remembers the code for 60 days. The watch can't type, so its server address carries the code: `https://<your-site>/w/<code>`.

Without the variable nothing asks for a code, as on a laptop. Use a long code made of letters, numbers and dashes, such as `maple-river-42-kite`. Changing the code locks everyone out until they enter the new one.

## Garmin watch app

The Garmin app in [`offshift-watch`](../offshift-watch/README.md) runs on a fēnix 8 and uses `/api/watch`:

- it fetches the waiting ask with its week lines and today's plans;
- it sends the worker's answer;
- only after the worker agrees on the watch, it sends body readings as words, one level from 0 to 3 per signal and never a number.

The calendar shows those words in the Body card, in the ask's body check and in the assistant's greeting. Turning sharing off on the watch clears them. Nothing about the body reaches `/api/team` or an employer.

A real watch only talks to https. Run `npm run watch-gateway`, which forwards `/api/watch` and nothing else on port 3001, and point a tunnel at it, for example `cloudflared tunnel --url http://127.0.0.1:3001`. A deployed https site such as Vercel needs no gateway: set the watch's server address to it.

## Phone calendars

Offshift doesn't read or write the phone's own calendar (Apple Calendar, Google Calendar or Outlook). The worker's week is entered in Offshift. A read-only calendar subscription could be added later if the team wants one.

## Immersive view

**Immersive** opens a wide 16:9 layout:

- a gesture guide on the left;
- the detailed week in the centre, where every block shows its title, time, category and status, and quiet-hour boundaries are drawn;
- the selected block on the right;
- spoken captions along the bottom.

Every gesture has a button as well, and **Use touch controls** gives large touch buttons.

Hand tracking is optional. It uses MediaPipe Hand Landmarker served from `public/mediapipe`, so no internet is needed. Turning the camera on asks for consent first. Video is processed in the browser and nothing is saved. A small face detector notices only that someone has arrived, so the view can say hello. It doesn't identify anyone or read expressions.

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

Nothing changes without a confirmation. Rostered shifts never move here; the view offers to draft a request to the manager instead. On opening, the assistant greets the worker, reads out today and any waiting ask, and asks how they are. That answer stays private.

With the voice on (https only), it listens for: confirm, cancel, undo, expand calendar, show full week, add rest.

## Voice assistant

The orb at the bottom left of the calendar briefs the worker on their day and any waiting ask, with the trade-offs Offshift flagged, and asks what they want to do. They answer by voice, with the chips or by typing. It uses the worker's first name only if one is set. It never diagnoses, never advises on health and never decides for the worker.

It talks through Claude Sonnet 5 when `ANTHROPIC_API_KEY` is set in `.env.local` (copy `.env.example`). Without a key it uses a scripted voice with the same lines. Speech output works over plain http. The microphone needs https (`npm run dev:https`).

## Tests

```bash
npm test            # unit tests (vitest)
npm run typecheck
npm run build
```

The tests cover dates and weeks, the Body and Week checks, the three answers and team actions, the three-way merge, the watch summary and health readings, the API routes, the assistant's script and the store.
