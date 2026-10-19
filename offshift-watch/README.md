# Offshift · Garmin watch app

A native Monkey C app for the confirmed **fēnix 8 47mm** (`fenix847mm`), extending the teammate's watch implementation. Four round pages show the waiting ask, the surrounding week, available body words and calendar sync. The UI uses the calendar's cream, forest-green and warm accent theme.

## Build a protected release

Install Garmin's Connect IQ SDK, Java and the fēnix 8 47mm device profile through SDK Manager. Keep a developer signing key outside the repository:

```bash
mkdir -p ~/garmin-keys
openssl genrsa -out ~/garmin-keys/developer_key.pem 4096
openssl pkcs8 -topk8 -inform PEM -outform DER \
  -in ~/garmin-keys/developer_key.pem -out ~/garmin-keys/developer_key.der -nocrypt
chmod 600 ~/garmin-keys/developer_key.*
```

Set the SDK and key paths for your machine, then run from the repository root:

```bash
export OFFSHIFT_GARMIN_SDK="/path/to/connect-iq-sdk"
export OFFSHIFT_GARMIN_KEY="$HOME/garmin-keys/developer_key.der"
# Optional when Java is not already on PATH:
# export OFFSHIFT_JAVA="/path/to/java/bin/java"
node offshift-watch/scripts/build.mjs --access-code-file /private/path/production.env
```

The private file must contain `OFFSHIFT_ACCESS_CODE=...`. The default origin is `https://offshift-nine.vercel.app`; `--url` also accepts the site's calendar link and normalizes it. The output is `offshift-watch/bin/device/OFFSHIFT.PRG`. With no code file the build uses the public API, which will be rejected by a code-protected deployment.

The builder compiles inside a private temporary folder, embeds the chosen endpoint and removes source and compiler intermediates afterward. Only the owner-readable program and symbol file are published after success; a failed compiler preserves the previous release. It does not change tracked source or print the private route. The binary contains that route and must stay private. Its file permissions are restricted to the owner and all generated binaries are ignored by Git.

The endpoint is compiled into the release. An old saved `baseUrl` setting cannot keep the watch on a laptop URL after an update. To change the deployed address or rotate its access code, build and install again; do not edit the legacy property file and assume it changes an installed release.

## Install only Offshift

Set the unplugged watch to **Settings → System → Advanced → USB Mode → MTP**, reconnect it and allow the Mac accessory if asked. Back up the existing Offshift PRG before replacing it. On macOS use an MTP client such as libmtp to access `GARMIN/Apps`; MTP storage may not appear in Finder. Copy only the new Offshift program, leaving other apps, activities and firmware alone.

After unplugging, open Offshift with the paired phone online and Garmin Connect available. On Calendar, check the last successful sync. Send a test ask, cancel a reply once, then explicitly confirm a reply and verify it on the calendar/team page. Obtain consent before checking real sensor delivery. A new signing key may cause the watch to treat this as a fresh install and ask about sharing again.

**Installation status, 19 October 2026:** the native release compiles, but the MTP interface briefly identified the correct model (`091e:51b8`), then dropped back to `091e:0003` before app backup. Stable file access is still pending. No physical update is claimed. The model is confirmed and the private device build is prepared.

## Simulator and tests

```bash
open "$OFFSHIFT_GARMIN_SDK/bin/ConnectIQ.app"
node offshift-watch/scripts/build.mjs --test
"$OFFSHIFT_GARMIN_SDK/bin/monkeydo" offshift-watch/bin/offshift-test.prg fenix847mm -t
node --test offshift-watch/test/*.test.mjs
```

There are 24 native tests and 9 Node build contracts/artifact checks. This SDK returned exit status 1 even for a complete native pass; inspect its final `PASSED (passed=24, failed=0, errors=0)` summary. The native tests use the real device profile's fonts, test round-screen bounds and contrast, and isolate replies from real network activity.

For an isolated laptop simulation, run the web app with a separate `OFFSHIFT_STATE_FILE`, then build explicitly for loopback:

```bash
node offshift-watch/scripts/build.mjs --development \
  --url http://127.0.0.1:3000 --out offshift-watch/bin/simulator.prg
"$OFFSHIFT_GARMIN_SDK/bin/monkeydo" offshift-watch/bin/simulator.prg fenix847mm
```

Use **Settings → Glance Launch Mode → Launch in Normal Mode** for the full app. Disable **Use Device HTTPS Requirements** only for this loopback simulation, then re-enable it when testing a real HTTPS release. Simulator sensor values are synthetic and cannot be reported as real Garmin measurements. Do not send them into a participant's live session.

## Pages and controls

Up/Down or a swipe moves between Ask, Around it/Today, Body and Calendar. Select on the first two pages opens the five answers; a manager reply requires confirmation. Decide later sets a reminder without sending the manager a message. Select on Body or Calendar opens reading details, sources and the sharing switch.

The calendar page shows the last successful sync and sharing choice. A failed answer retains the ask for retry. A successful answer clears an old offline status. An access-code error is shown without exposing the private endpoint.

## Cloud connection

The deployed route is watch → paired phone/Garmin Connect → internet → Vercel → Redis. Once installed it does not depend on a laptop server or tunnel. The app polls every five seconds while open and registers a five-minute background event; Garmin controls actual background scheduling. The public server uses `KV_REST_API_URL` and `KV_REST_API_TOKEN` and a shared access code.

One deployment holds one participant session at a time. The `/team` response omits body readings and private plans, but the shared code does not implement separate employer and worker account roles. The `/watch` browser preview uses a separate import/reflection store and is not the native Garmin feed.

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

The overall word is Body Battery, which Garmin already builds from sleep, stress, heart-rate variability and activity. When it is unavailable, the app does not invent a reading. Availability depends on the watch, permissions and recent sensor history. Breathing and pulse ox are single moments that change when you walk upstairs, so they show on the watch and the calendar but never colour the check on their own.

Every reader looks back for the most recent real sample, because samples are blank while the watch is off the wrist or on its cable. Sleep and resting heart come from last night only (10 pm to an hour after your usual wake time). They are worked out once a day and remembered, and only when the watch still holds the night from before 3 am. Otherwise they read "No reading", because a guess about someone's night is worse than none.

## Privacy

- The watch asks once, on first open. Sharing can be changed any time on Your body.
- Only a level (0 to 3) per signal and the time leave the watch, never a number. The calendar shows words.
- Turning sharing off makes the calendar forget the last reading.
- Body readings never go to an employer.

## Every five minutes

While the app is closed, a background check shares the body (if allowed), updates the glance, and offers to open Offshift when a new ask arrives. It never answers anything.
