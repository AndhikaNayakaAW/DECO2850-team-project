[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment) · [Watch & reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection) · [Weekly contribution](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution)

# Testing and TDD

The current web suite passes **200 tests across 20 files**. The native Garmin suite passes **24 tests** in the `fenix847mm` simulator. The release builder has **9 Node contract and artifact tests**, also run in GitHub Actions. Native simulator checks run separately on a Mac with Garmin's SDK and device profile.

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

The simulator must be open. Inspect its final `PASSED (passed=24, failed=0, errors=0)` summary. On this SDK installation `monkeydo` returned status 1 even when that complete summary passed; the native result was checked from its output, not inferred from the exit status.

## Five observed test-first cycles

| Cycle | Red evidence | Green implementation |
| :--- | :--- | :--- |
| Production endpoint | 6 build contracts fail; one rejection guard passes. | HTTPS validation, normalized calendar URLs, private access-code build and explicit loopback simulation. |
| Round-screen theme | Original 15 native tests pass; 3 new theme assertions fail. | Cream ground, Offshift branding, readable ink, vector type and page indicators; all 18 pass. |
| Reply status and confirmation | 21 native tests pass; 2 fail on stale offline status and an opaque 401. | Clear status after a reply and explain access errors; all 23 pass. Cancellation and failed-send safety also verified. |
| Retained laptop settings | A targeted native regression fails after persisting a laptop URL. | Each build uses its compiled endpoint; all 24 native tests pass. |
| Private build artifacts | Two new tests fail: MIR is published beside the release and compiler failure replaces a working binary. | Compile privately and publish program/symbol files after success; all nine build tests pass. |

Each red test commit precedes its green implementation commit. The [current contribution record](Weekly-Contribution) links every commit. UI copy and glance polish were subsequent refinements, not represented as additional TDD cycles.

## Native coverage

Layout checks use Garmin's device fonts and circle geometry to find overlap, clipping and premature truncation for asks, deferred asks, empty/offline states and long names. Theme tests measure text contrast. Sync tests exercise failed replies, successful recovery, cancellation and explicit confirmation without real network requests. Health tests retain the teammate's original mapping and raw-value boundary checks.

The native log is saved as [release evidence](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/contributions/assets/garmin-native-tests-2026-10-19.txt). The refreshed Ask page was also inspected in the simulator using an isolated practice session.

## Production integration checks

Seventeen synthetic checks ran against the deployed HTTPS API with Redis. They verified unauthorized access, the login cookie, shared asks, a pair of concurrent answers resolving only once, one resulting shift, health sharing, the team projection and sharing-off deletion. The synthetic session was cleared afterward. [Machine-readable results](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/contributions/assets/garmin-production-verification-2026-10-19.json).

These checks do not prove physical watch installation, real sensor delivery, accessibility on the wrist or worker outcomes. Record those separately when actually observed. Previous browser-reflection and overnight-shift TDD evidence remains in the [15 October contribution report](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/contributions/2026-10-15-watch-reflection.md).

[Build contract and artifact test output](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/contributions/assets/garmin-build-tests-2026-10-19.txt).
