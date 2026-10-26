[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment) · [Watch & reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection) · [Weekly contribution](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution)

# Testing and TDD

On **26 October 2026**, release checks passed **225 web tests across 25 files**, **10 Node build contract and artifact tests**, the standalone prototype tests, TypeScript and the production build. The latest native commit, [`a44c648`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/a44c648), records **38 tests** passing in the `fenix847mm` simulator. Native simulator checks were not rerun for this web deployment; they require Garmin's SDK and device profile.

## Run the checks

```bash
cd offshift-phone
npm test
npm run typecheck
npm run build
cd ..
node --test offshift-watch/test/*.test.mjs
node --test prototype/offshift.logic.test.js
```

For native tests, set the SDK and signing-key paths as documented in `offshift-watch/README.md`:

```bash
node offshift-watch/scripts/build.mjs --test
"$OFFSHIFT_GARMIN_SDK/bin/monkeydo" offshift-watch/bin/offshift-test.prg fenix847mm -t
```

The simulator must be open. The latest recorded summary is `PASSED (passed=38, failed=0, errors=0)`. On this SDK installation `monkeydo` returned status 1 even when the complete summary passed; check the native result from its output, not only its exit status.

## Observed test-first cycles

| Cycle | Red evidence | Green implementation |
| :--- | :--- | :--- |
| Production endpoint | 6 build contracts fail; one rejection guard passes. | HTTPS validation, normalized calendar URLs, private access-code build and explicit loopback simulation. |
| Round-screen theme | Original 15 native tests pass; 3 new theme assertions fail. | Cream ground, Offshift branding, readable ink, vector type and page indicators; all 18 pass. |
| Reply status and confirmation | 21 native tests pass; 2 fail on stale offline status and an opaque 401. | Clear status after a reply and explain access errors; all 23 pass. Cancellation and failed-send safety also verified. |
| Retained laptop settings | A targeted native regression fails after persisting a laptop URL. | Each build uses its compiled endpoint; all 24 native tests pass. |
| Private build artifacts | Two new tests fail: MIR is published beside the release and compiler failure replaces a working binary. | Compile privately and publish program/symbol files after success; all nine build tests pass. |
| Missing sensor history | `6e81a03`: 25 pass; one new assertion errors because a timestamp-only payload is produced. | `9465c22`: no health upload without a signal; foreground/background fetch the calendar, and band zero remains valid. All 26 pass. |
| Biometrics during each shift (web, 25 Oct) | The past-shifts and shift-body suites can't load; 8 of 181 other tests fail. | The calendar keeps stress and heart levels per 15 minutes on each shift, draws them on the shift, adds a Past shifts check to every ask, and drops the all-day reading and the second rating. All 212 pass. |
| Biometrics during each shift (watch, 25 Oct) | The native test build stops on undefined `ShiftBody`, `Blocks`, `readShift` and `onShiftBodySent`. | The watch reads its own stress and heart-rate history for a finished shift only, sends one level per quarter hour once, and shows the last shift. All 31 pass. |
| Review fixes (web, 25 Oct) | 10 new tests fail: readings lost or brought back by merges, readings for a moved shift, duplicates, the edit form wiping a watch rating. | Readings are merged on their own, carry their window, are stored once, and the form saves only a changed rating. All 222 pass. |
| Review fixes (watch, 25 Oct) | The native build stops on an undefined `onForgotten`. | "Sharing off" is owed until the calendar confirms, refused readings aren't resent, and failed sends back off. All 35 pass. |
| Plain-text uploads (web, 25 Oct) | [`60f2e85`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/60f2e85): three new tests fail for text levels and private refusal logs. | [`902e406`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/902e406): accept `0`–`3` and `-` per block, preserve missing readings, and log rejection reasons privately. All 225 pass. |
| Plain-text uploads (watch, 25 Oct) | [`a2e5375`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/a2e5375): native build stops on undefined serialization and status helpers. | [`a44c648`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/a44c648): send each signal as text, retry the earlier failed format once, and show saved/not-saved status. The commit records 38 native passes. |

Each red test commit precedes its green implementation commit. The [contribution record](Weekly-Contribution) and [shift-reading design report](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/design/2026-10-25-biometrics-during-shifts.md) provide the supporting history. UI copy and glance polish were subsequent refinements, not represented as additional TDD cycles.

## Native coverage

Layout checks use Garmin's device fonts and circle geometry to find overlap, clipping and premature truncation for asks, deferred asks, empty/offline states and long names. Theme tests measure text contrast. Sync tests exercise failed answers, successful recovery, cancellation and explicit confirmation without real network requests. Shift-body tests cover 15-minute aggregation, missing readings, wire encoding, retries, sharing-off and upload status. Check-in tests cover the single post-shift rating.

The native log is saved as [release evidence](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/contributions/assets/garmin-native-tests-2026-10-19.txt). The refreshed Ask page was also inspected in the simulator using an isolated practice session.

## Earlier production integration checks · 19 October

Seventeen synthetic checks ran against the then-protected HTTPS API with Redis. They verified unauthorized access, the login cookie, shared asks, a pair of concurrent answers resolving only once, one resulting shift, health sharing, the team projection and sharing-off deletion. The synthetic session was cleared afterward. These are historical results for the earlier all-day-reading implementation, not a rerun of the current per-shift flow. [Machine-readable results](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/contributions/assets/garmin-production-verification-2026-10-19.json).

These checks do not prove physical watch installation, real sensor delivery, accessibility on the wrist or worker outcomes. Record those separately when actually observed. Previous browser-reflection and overnight-shift TDD evidence remains in the [15 October contribution report](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/contributions/2026-10-15-watch-reflection.md).

[Build contract and artifact test output](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/contributions/assets/garmin-build-tests-2026-10-19.txt).

## Physical test · 20 October

The physical watch completed a verified request/reply round trip and delivered available Garmin bands. The corrected release was transferred and read back exactly; post-transfer connection evidence is tracked independently.
