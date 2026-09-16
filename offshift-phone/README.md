# Offshift · phone + calendar prototype

Two screens from one Next.js app, kept in sync over your local network.

- **Phone** at `/`: lock screen, then the apps page (Offshift, Pandora Team, McDonald's Crew, myUQ, Settings) and the manager page.
- **Calendar** at `/calendar`: the 3D week, full screen, for an iPad.

## Run

```bash
cd offshift-phone
npm install
npm run dev
```

The terminal prints a Network URL such as `http://192.168.1.20:3000`. On the phone open that URL. On the iPad open the same URL with `/calendar` on the end. Both devices must be on the same Wi-Fi as the computer running it.

Add to Home Screen on iOS for a full-screen app without browser chrome.

## Calendar (iPad)

Touch empty space and drag to orbit, pinch or scroll to zoom, double-tap to reset. Tap a day to see it in the side panel, tap the amber block to see the ask with the Body, Week and Money checks, toggle the legend chips to filter, add a plan with + Plan. Arrow keys move the day.

Touch a block to pick it up. Drag a plan onto another day to move it. Flick any block away, or drop it on the bin, and it shatters: plans, shifts and classes are removed, an ask is declined. Undo appears for a few seconds.

## Immersive view (iPad or laptop)

"Enter immersive view" on the calendar opens a wide 16:9 layout: gesture guide on the left, the detailed week in the centre, the selected block on the right, spoken captions along the bottom. Every block shows title, time, category and status; travel time and quiet-hour boundaries are drawn too. It reads the same shared state as the phone.

Buttons: Exit, Reset view, Camera on/off, Voice on/off, Use touch controls, Mute, Expand layers, Combine layers, zoom + and −, Add event, Undo. Mouse and keyboard: drag to rotate, wheel or +/− to zoom, click to select, drag a block to preview a move, arrow keys rotate and tilt, Esc exits.

Optional hand tracking uses MediaPipe Hand Landmarker served from `public/mediapipe` (no internet needed). Camera on asks for consent first; video is processed in the browser and nothing is saved. A hand cursor follows your index finger (it fills in while you pinch) and the block under it lights up.

Gestures: both palms open for half a second separates the week into layers (work forward, study up, plans back, rest aside, asks floating, travel drawn as links); closing both hands combines it; hands apart or together zoom; moving both hands rotates and tilts; pinch selects; pinch and drag previews a move (snapped to 15 minutes, with overlap, travel, rest and boundary notes); pinch and hold empty space for a second starts a new event, then raise one finger for study, two for personal, three for rest, four for an appointment; an open palm held over the selection offers to protect it. Thumbs up confirms, thumbs down cancels or keeps the original, a held fist undoes. Nothing changes without a confirmation. Rostered shifts never move directly: the view offers to prepare a request to the manager instead.

When the immersive week opens, the assistant greets by the time of day and the date, lists today's items and any waiting ask, then asks two questions answered by thumbs up or down: whether you wish to change your plan, and how you are today. The mood answer is noted privately and never used to decide anything. With the camera on, a small face detector notices when someone arrives (presence only, no identity or expressions), draws a scanning frame on the preview, and greets again if it has been a while.

For the exhibit, open `/calendar?immersive=1` to start straight in the immersive week. Camera consent is remembered for the browser session.

Voice on (HTTPS only) listens for: confirm, cancel, undo, expand calendar, show full week, add rest.

## Voice assistant (iPad)

The glowing orb at the bottom left of the calendar. Tap it and it greets Dinda by the time of day, runs through her day, mentions any waiting ask with the trade-offs Offshift flagged, and asks what she wants to do. Answer by voice, by the chips, or by typing: take it, another time, swap, not tonight, later. It also speaks up on its own when a new ask arrives while it is on.

It talks through Claude Sonnet 5. Put an API key from console.anthropic.com in `.env.local` (copy `.env.example`) and restart the dev server. Without a key it falls back to a scripted voice with the same lines, so the demo still runs. The panel header shows which one is active.

Speech output works over plain HTTP. The microphone on an iPad needs HTTPS: run `npm run dev:https`, open the `https://` Network URL on the iPad, accept the certificate warning once, and allow the microphone. Without that, use the chips or type.

## Phone

Offshift: Week (3D week, asks, agenda, add plan), Offer (checks, impact tiles, take it / another time / swap / not tonight / decide later), Reply, Check-in, Money, Me. Pandora Team and McDonald's Crew: roster and chat. Manager page: ask Dinda, roster, chat for Jess (Pandora) or Raj (McDonald's).

## Sync

Every device reads and writes `/api/state`, a small route in this app that keeps the scenario in memory and in `.offshift-state.json`. Changes on one device reach the others within about a second. Reset from Settings on the phone.
