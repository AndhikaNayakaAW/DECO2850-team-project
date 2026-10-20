# Garmin testing · 20 October 2026

[Download the screen-by-screen PDF](Offshift-Garmin-Testing-2026-10-20.pdf).

The physical fēnix 8 47mm reached production through the paired phone. A clearly named synthetic request appeared on the watch. The owner confirmed that the prompt said **Take it**, and the server recorded one accepted reply and exactly one resulting shift. Available Garmin bands also arrived. The synthetic request, linked shift and messages were removed using the current state as the merge base, preserving the session and wearable record. Personal band values are excluded from the evidence.

All watch images in this folder are **native Garmin simulator captures with synthetic data**. They are not physical-watch photographs or remote screen captures. The simulator's compiled endpoint was `http://127.0.0.1:3002`, served by a separate file-backed Next server; it never called the production watch endpoint. Physical observations read only production `/api/state` and `/api/team`. Source PNGs are preserved; the PDF clips their placement to the circular display.

## Observed fix

When sharing was on and every sensor was unavailable, the previous native payload contained only `at`. The local API returned HTTP 400. Commit [`6e81a03`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/6e81a03) adds a regression and a valid-zero guard. The Garmin runner reported 25 passes and one assertion error (`ASSERTION FAILED`) in the missing-reading case.

Commit [`9465c22`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/9465c22) makes the payload nullable and makes both foreground and background checks fetch the calendar when no reading exists. All **26 native tests** pass. The protected release was queued in the watch's Apps folder; its readback matches SHA-256 exactly. The owner reports the updated app opens and shows Synced. The separately recorded post-transfer server observation determines whether that display is fresh; do not infer it from the owner report alone.

The visible MTP Apps listing contained no PRG even though Offshift was running before the update. Therefore, absence from that listing does **not** establish that no app is installed. No existing files were deleted, and the previous verified release remains in a private backup outside Git. This corrects the earlier inference that the 19 October transfer necessarily represented a fresh installation.

## Checks and reproduction

The web suite passed **200 tests across 20 files**, and the production build including TypeScript validation passed. All **nine Node build tests** passed. See [native baseline](evidence/native-tests.txt), [red regression](evidence/native-red.txt), [green regression](evidence/native-green.txt), [physical round trip](evidence/physical-watch.json) and [update transfer](evidence/install-update.json). The 17 synthetic production checks in the 19 October report are separate historical evidence.

```sh
npm --prefix offshift-phone test
npm --prefix offshift-phone run build
node --test offshift-watch/test/*.test.mjs
```

Build and run native tests using the SDK/key instructions in [the native README](../../../offshift-watch/README.md). For screen reproduction, run a separate Next server with Redis variables unset, `OFFSHIFT_STATE_FILE` pointing to a temporary file and an empty `OFFSHIFT_ACCESS_CODE`. Verify `/api/state` reports `storage: file`. Load a local practice week, create the Alex/Test Cafe request, and compile the simulator explicitly for loopback. Use the watch buttons to inspect all four pages, the body menu, sharing, answer menu and confirmation. Temporarily stop only the local server to inspect offline status, and use a simulator-only access code to inspect 401 handling. Restore device HTTPS requirements after the loopback test.

To rebuild the PDF from checked-in captures, install ReportLab in a Python virtual environment and run:

```sh
python scripts/build-garmin-testing-pdf.py
```

The PDF covers the four main pages, body details, sharing, answer choices, confirmations, post-reply states, unavailable-server status and access-code status. Long-term background timing, battery impact, every response on physical hardware, every sensor type and worker research outcomes remain unverified. Technical success does not establish reduced stress or clinically meaningful interpretation.

Prepared with Codex assistance for Andhika Nayaka Arya Wibowo's contribution record.
