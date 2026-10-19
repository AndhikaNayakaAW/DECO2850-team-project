# Offshift · Garmin watch app

Offshift on the wrist. It shows the waiting ask with its Week lines from the calendar, your body as the watch reads it, and the five answers. It's a Connect IQ app in Monkey C for the fēnix 8 47mm and talks to the same server as the calendar (`offshift-phone`, route `/api/watch`).

## Build

You need the Connect IQ SDK (9.2, through the SDK Manager), the fēnix 8 47mm device files, Java, and a developer key. Make the key once and keep it out of the repo:

```bash
mkdir -p ~/garmin-keys && cd ~/garmin-keys
openssl genrsa -out developer_key.pem 4096
openssl pkcs8 -topk8 -inform PEM -outform DER -in developer_key.pem -out developer_key.der -nocrypt
```

Then build:

```bash
cd offshift-watch
SDK="$HOME/Library/Application Support/Garmin/ConnectIQ/Sdks/connectiq-sdk-mac-9.2.0-2026-06-09-92a1605b2"
"$SDK/bin/monkeyc" -o bin/offshift.prg -f monkey.jungle -y ~/garmin-keys/developer_key.der -d fenix847mm
```

## Run in the simulator

1. Start the server: `cd offshift-phone && npm run dev`.
2. Open the simulator: `open "$SDK/bin/ConnectIQ.app"`. Once, untick Settings › Use Device HTTPS Requirements, because the laptop server is plain http.
3. Load the app: `"$SDK/bin/monkeydo" bin/offshift.prg fenix847mm`.

On first open the app asks whether to share body readings with the calendar. If the simulator shows "Jess asked you to cover tonight… Open Offshift?" before the app appears, that is the background check finding the ask. Choose Yes.

## On the wrist

A real watch only talks to https, and the watch reaches the internet through the Garmin Connect app on the paired phone.

**With the deployed site** (Vercel), skip the laptop. Put the site's address in `baseUrl`, for example `https://offshift-nine.vercel.app`. If the site has an access code, add `/w/<code>`: `https://offshift-nine.vercel.app/w/maple-river-42-kite`. No trailing slash either way. Then build and install as in steps 2 and 3.

**With the laptop:**

1. On the laptop, start the server and the watch gateway, which forwards `/api/watch` and nothing else:
   ```bash
   cd offshift-phone && npm run dev            # :3000
   npm run watch-gateway                       # :3001, in a second terminal
   cloudflared tunnel --url http://127.0.0.1:3001
   ```
   cloudflared prints an address like `https://some-words.trycloudflare.com`. A quick tunnel's address changes every time it restarts, and it dies if the laptop sleeps for long. For the exhibit, use a fixed address.
2. Put that address in `baseUrl` in `resources/properties/properties.xml`, and build a release copy:
   ```bash
   "$SDK/bin/monkeyc" -o bin/device/OFFSHIFT.PRG -f monkey.jungle -y ~/garmin-keys/developer_key.der -d fenix847mm -r
   ```
   Put `baseUrl` back to `http://127.0.0.1:3000` before committing, since the simulator uses that.
3. Plug the watch in by USB and copy the file into `GARMIN/Apps`. On a Mac, use OpenMTP, or libmtp (`brew install libmtp`):
   ```bash
   mtp-folders                                   # note the number next to "Apps"
   mtp-sendfile bin/device/OFFSHIFT.PRG <AppsNumber>/OFFSHIFT.PRG
   ```
4. Unplug the watch and open Offshift from the apps list. The Calendar page says "Synced" with the time once it can reach the laptop. "Calendar offline (-300)" means the address isn't answering. "(-1001)" means the build still has the http address.

## Working on it together

- Pull, edit and build with your own developer key; keys never go in the repo. Run the tests before installing: `npm test` in `offshift-phone`, and the watch tests below. The layout tests catch text that overlaps or runs off the round screen.
- A bug in your build can crash the app ("IQ!" on the watch), but never the watch itself. Copy a working build over it and it's back.
- The watch talks to whichever address was in the last build installed on it. If two people install onto the same watch, the last install wins.
- Replacing a sideloaded build with one signed by a different developer key may be treated as a fresh install, so the watch may ask about sharing again.
- The manifest lists the fēnix 8 47mm only. For another Garmin, add its product id to `manifest.xml`, download it in the SDK Manager, and check the layout tests still pass at its screen size.

## Pages and controls

Four pages, one idea each. Scroll with Up and Down or swipe:

1. **Ask**: who is asking, what, and when, e.g. "Jess - Pandora / Cover tonight? / 4-9 pm". While you're deciding later, the reminder shows at the bottom.
2. **Around it**: the week around the ask (a clash, the trip there, tomorrow's start). When nothing is waiting, it shows today's plans instead.
3. **Body**: the overall word from Body Battery, then sleep, stress and heart.
4. **Calendar**: when the watch last synced, what is waiting, and whether the body is shared ("words only") or stays on the watch.

Select (top right) or a tap answers the ask on the first two pages: pick one of the five answers, then confirm. Decide later sends nothing and sets a reminder. On the last two pages, Select opens Your body: every signal in words with the watch's own number, where each reading comes from, and the Share with calendar switch.

Text is laid out to the round screen. Each line wraps to the width of the circle where it sits and steps down a font size before it would be cut short. A page that is still too tall leaves out its last line rather than overlapping. Layout tests draw every page off-screen with the watch's real fonts and fail on any overlap or text past the edge.

## What it reads

| Signal | From | Levels, best to lowest |
|---|---|---|
| Energy | Body Battery | Plenty 70+, Steady 40+, Running low 20+, Very low |
| Sleep | Body Battery regained last night (watch apps can't read Garmin's sleep score) | Good +50, Fair +30, Poor +15, Very poor |
| Stress | Average of the last 3 hours, Garmin's bands | Resting 0–25, Low 26–50, Medium 51–75, High 76+ |
| Heart | Last night's lowest half-hour heart rate against the watch's 7-day resting average | As usual, Slightly above (+3 to +5), Above (+6 to +9), Well above |
| Breathing | Breaths a minute, latest | Calm to 16, Steady to 20, Fast to 25, Very fast |
| Pulse ox | Latest Pulse Ox reading | Good 95+, Slightly low 90+, Low 85+, Very low |
| Recovery | Garmin recovery time after the last workout | Recovered, Recovering (to 24 h), Still recovering (to 48 h), Long way off |
| Steps | Steps today, intensity minutes this week | Shown on the watch only |

The overall word is Body Battery, which Garmin already builds from sleep, stress, heart-rate variability and activity. Without it the watch isn't being worn, so the calendar keeps the last reading. Breathing and pulse ox are single moments that change when you walk upstairs, so they show on the watch and the calendar but never colour the check on their own.

Every reader looks back for the most recent real sample, because samples are blank while the watch is off the wrist or on its cable. Sleep and resting heart come from last night only (10 pm to an hour after your usual wake time). They are worked out once a day and remembered, and only when the watch still holds the night from before 3 am. Otherwise they read "No reading", because a guess about someone's night is worse than none.

## Privacy

- The watch asks once, on first open. Sharing can be changed any time on Your body.
- Only a level (0 to 3) per signal and the time leave the watch, never a number. The calendar shows words.
- Turning sharing off makes the calendar forget the last reading.
- Body readings never go to an employer.

## Every five minutes

While the app is closed, a background check shares the body (if allowed), updates the glance, and offers to open Offshift when a new ask arrives. It never answers anything.

## Tests

```bash
"$SDK/bin/monkeyc" -o bin/offshift-test.prg -f monkey.jungle -y ~/garmin-keys/developer_key.der -d fenix847mm --unit-test
"$SDK/bin/monkeydo" bin/offshift-test.prg fenix847mm -t
```

The server side (words, the body check, `/api/watch`) is tested with `npm test` in `offshift-phone`.
