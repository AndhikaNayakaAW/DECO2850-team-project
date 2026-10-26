# Offshift · Garmin watch app

A native Monkey C app for the confirmed **fēnix 8 47mm** (`fenix847mm`), extending the teammate's watch implementation. Four round pages show the waiting ask, the week around it, the last shift the watch read, and calendar sync. The UI uses the calendar's cream, forest-green and warm accent theme.

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

Set the unplugged watch to **Watch Settings → System → Advanced → USB Mode → MTP**, reconnect it and allow the Mac accessory if asked. Back up the existing Offshift PRG before replacing it. On macOS use an MTP client such as libmtp to access `GARMIN/Apps`; MTP storage may not appear in Finder. Copy only the new Offshift program, leaving other apps, activities and firmware alone.

After unplugging, open Offshift with the paired phone online and Garmin Connect available. On Calendar, check the last successful sync. Send a test ask from the calendar, cancel an answer once, then confirm Accept and check the shift appears on the calendar. Obtain consent before checking real sensor delivery. A new signing key may cause the watch to treat this as a fresh install and ask about sharing again.

**Installation status, 19 October 2026:** installed on the actual fēnix 8 47mm. No existing PRG was exposed in the visible Apps listing; existing files were preserved. That listing does not establish whether Offshift was already installed. The 37,420-byte program downloaded back from the watch has exactly the same SHA-256 as the release. The owner confirms Offshift opens, currently reporting “Phone not connected.” The paired-phone communication bridge is being checked; real sensor delivery is not yet verified.

**Follow-up, 20 October 2026:** an available paired phone enabled a verified physical request/reply round trip and delivery of available Garmin bands. The missing-reading fix passes 26 native tests and its updated transfer matches the compiled hash. The owner reports Synced after the update; a fresh post-transfer server contact is recorded separately.

## Simulator and tests

```bash
open "$OFFSHIFT_GARMIN_SDK/bin/ConnectIQ.app"
node offshift-watch/scripts/build.mjs --test
"$OFFSHIFT_GARMIN_SDK/bin/monkeydo" offshift-watch/bin/offshift-test.prg fenix847mm -t
node --test offshift-watch/test/*.test.mjs
```

The latest native commit, [`a44c648`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/a44c648), records 38 passing native tests. All 10 Node build contracts/artifact checks were rerun and passed on 26 October; the native simulator was not rerun for that web release. This SDK returned exit status 1 even for a complete native pass; inspect its final `PASSED (passed=38, failed=0, errors=0)` summary. The native tests use the real device profile's fonts, test round-screen bounds and contrast, and isolate answers from real network activity.

For an isolated laptop simulation, run the web app with a separate `OFFSHIFT_STATE_FILE`, then build explicitly for loopback:

```bash
node offshift-watch/scripts/build.mjs --development \
  --url http://127.0.0.1:3000 --out offshift-watch/bin/simulator.prg
"$OFFSHIFT_GARMIN_SDK/bin/monkeydo" offshift-watch/bin/simulator.prg fenix847mm
```

Use **Settings → Glance Launch Mode → Launch in Normal Mode** for the full app. Disable **Use Device HTTPS Requirements** only for this loopback simulation, then re-enable it when testing a real HTTPS release. Simulator sensor values are synthetic and cannot be reported as real Garmin measurements. Do not send them into a participant's live session.

## Pages and controls

Up/Down or a swipe moves between Ask, Around it/Today, Last shift and Calendar. Around it leads with how the last shifts at that workplace went ("Last 2 at Cafe: Hard, Busy"). Select on the first two pages opens the three answers: Accept and Decline each ask for confirmation, and Decide later keeps the ask, marked "Saved for later". No answer sends the manager a message. Select on Last shift or Calendar opens the shift's stress and heart in words, where each comes from, and the sharing switch.

About 15 minutes after a rostered shift ends, the watch buzzes once and asks how the work was: **Light**, **Steady**, **Busy** or **Hard**, or **Skip**. One press saves it on that shift; backing out counts as a skip. It never asks twice about the same shift, and it stops asking 12 hours after the end. The rating colours the shift on the calendar, where it can be changed. Why it works this way: [design rationale](../docs/design/2026-10-23-shift-check-in.md).

The calendar page shows the last successful sync and sharing choice. A failed answer retains the ask for retry. A successful answer clears an old offline status. An access-code error is shown without exposing the private endpoint.

## Cloud connection

The deployed route is watch → paired phone/Garmin Connect → internet → Vercel → Redis. Once installed it does not depend on a laptop server or tunnel. The app polls every five seconds while open and registers a five-minute background event; Garmin controls actual background scheduling. The public server uses `KV_REST_API_URL` and `KV_REST_API_TOKEN`. The prototype opens without an access code; older installed watch addresses remain compatible. `OFFSHIFT_ACCESS_CODE` is optional if access restriction is needed later.

One deployment holds one participant session at a time. The `/api/team` response omits shifts, ratings, readings and private plans, but the prototype does not implement separate employer and worker account roles. The old `/team` page redirects to the calendar; **Test offer** on the calendar sends a sample ask.

## What it reads

Offshift reads the body **only during the worker's rostered shifts**, and only two signals. When the calendar names a shift that ended 15 minutes to 12 hours ago, the watch reads its own history for exactly those hours, averages each 15 minutes, and turns each average into a level from 0 to 3:

| Signal | From | Levels, 0 to 3 |
|---|---|---|
| Stress | Garmin's stress score, which the watch works out from heart-rate variability while you are still | Resting 0–25, Low 26–50, Medium 51–75, High 76–100 (Garmin's own bands) |
| Heart | Heart rate as a share of your heart-rate reserve: between your resting rate (the watch's 7-day average) and your maximum (the top of your heart-rate zones) | Very light under 30%, Light 30–39%, Moderate 40–59%, Vigorous 60% and over |

A quarter hour needs at least two real samples, or it is "no reading": samples are blank while the watch is off the wrist, and Garmin doesn't measure stress while you are moving. A gap stays a gap; it never becomes a low reading. Body Battery, sleep, breathing, pulse ox, recovery time and steps are not read: they describe the whole day rather than the shift, Garmin keeps its sleep score from apps, and the tutor asked us not to model the body as a battery. Why: [design rationale](../docs/design/2026-10-25-biometrics-during-shifts.md).

Each signal is uploaded as text, one character per quarter hour: `0`–`3` for a level and `-` for no reading. Last shift details include a Calendar line: **Not sent yet**, **Saved on your calendar** or **Not saved yet (code)**. The server checks the shift's time window and block count, and privately logs rejected uploads. Installing the new format allows a shift whose older-format upload failed to be sent again. Deploying the website alone does not install this watch update.

## Privacy

- The watch asks once, on first open: "Share stress and heart from shifts?" Sharing can be changed any time from Last shift.
- Only one level (0 to 3) per 15 minutes of a shift leaves the watch, never a number, and never anything from outside a shift. The calendar shows words and grey cells.
- Turning sharing off makes the calendar forget every shift's readings, and the watch reads nothing more. The watch keeps asking until the calendar confirms, and asks again if readings ever turn up while sharing is off.
- Readings never go to an employer, and neither do shift ratings.

## Every five minutes

While the app is closed, a background check updates the glance, offers to open Offshift when a new ask arrives or a shift has just finished, and, if the worker shares, reads and sends that shift once. It never answers anything.

## If the watch says Phone not connected

Keep Bluetooth enabled and open Garmin Connect on the paired phone with internet access, then leave and reopen Offshift. The Mac USB cable does not supply the Garmin Connect communication bridge. If pairing was never completed, use Garmin Connect → Garmin Devices → Add Device and the watch's Watch Settings → Connectivity → Phone → Pair Phone, following [Garmin's pairing guide](https://www8.garmin.com/manuals-apac/webhelp/fenix8series/EN-SG/GUID-071CBA5B-A374-47E7-89D3-17EAFF55AF52-9119.html). Pair through Garmin Connect, not only the phone's Bluetooth settings.

This status corresponds to Garmin's `BLE_CONNECTION_UNAVAILABLE` (`-104`), before an HTTP response from Vercel. A connected indicator in Garmin Connect does not prove that this app's web request succeeded. If reopening both apps does not help, restart the phone and watch normally, keep them nearby, and check Garmin Connect is current, as described in [Garmin's connection troubleshooting](https://www8.garmin.com/manuals/webhelp/GUID-EECCAC99-90D6-4AB1-9A3A-EC433D3365E2/EN-US/GUID-4442F808-670B-4EF3-AC60-32666F173DFD.html). Do not factory-reset the watch for this check.

The glance can retain the last saved ask while disconnected. A name or shift there is not proof of a current server connection. Verify Calendar's successful sync time and a fresh server `watchSeenAt` timestamp instead. Body's “No reading” means the signal is unavailable; a USB connection, a working API or an old glance does not establish that sensors supplied data. The installed physical watch cannot be viewed or controlled through the development simulator.

The paired phone must actually be nearby and available. On 19 October the owner clarified that this watch was paired to another person's phone, which was unavailable for continued testing. Pair an available phone through Garmin Connect to use the installed release. Garmin Express on the Mac handles device management and Garmin sync; it is not the mobile communication bridge for this app. A separate `Communications.SyncDelegate` Wi-Fi mode is supported by Garmin on the target model but is not implemented in this release.
