[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment) · [Watch & reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection) · [Weekly contribution](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution)

# UI release and screenshots · 27 October 2026

Pulled `main` through [`2e93548`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/2e93548). The new UI keeps violet work ratings on the 3D blocks, uses a blue dot to mark available watch readings, and reveals a timed bar graph on hover or tap. Yellow-green-blue bars replace the grey strips. The ask shows past-shift rows directly and names its answers Accept, Decline and Decide later, matching the simplified Garmin menu.

Captured six current screenshots from a local production build with synthetic names, commitments and readings, an isolated file store and a separate Chrome profile. Updated all three READMEs, wiki pages and the design storyboard to use the new images and describe the current controls. The older dated screenshots remain historical evidence. [Screenshot gallery](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/wiki/README.md#current-ui-screenshots) · [Browser checks](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/wiki/assets/2026-10-27-browser-checks.json).

Release validation passed **230 web tests across 25 files**, **10 Garmin build contracts**, the standalone prototype tests, TypeScript and the production build. Browser checks covered the scene, both hover signals, missing samples, axis labels, shift details, past-shift rows, answer labels, mobile overflow and browser exceptions. The native UI commit records 39 passing simulator tests; those tests and physical watch installation were not rerun for this web release. Documentation and release maintenance were assisted by Codex.

| Change | Implementation evidence |
| :--- | :--- |
| Native answers show names only | [`631332b` red](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/631332b) · [`624620b` green](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/624620b) |
| New reading palette | [`8f0d8e9` red](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/8f0d8e9) · [`51ec4d8` green](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/51ec4d8) |
| Graphs with a time axis | [`bb6f737` red](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/bb6f737) · [`77f8105` green](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/77f8105) |
| Reading dots and graph on demand | [`3139705` test](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/3139705) · [`279ff70` implementation](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/279ff70) |
| Quieter ask panel | [`e408cdc`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/e408cdc) |

The [deployment guide](Deployment) describes production deployment and publication of the wiki's separate repository. Web deployment does not install the native watch build.

## Earlier release maintenance · 26 October 2026

Pulled `main` through [`a44c648`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/a44c648), bringing in the calendar-only interface, one post-shift work rating, shift-specific stress/heart ribbons and the Past shifts comparison. The latest fixes send levels as text, preserve missing readings, log refused uploads privately and show whether the calendar saved the watch upload.

Updated the main and web-app READMEs and the handbook to describe the current routes, answers, shared session, optional access code and separate watch installation. On 26 October the public calendar returned HTTP 200 without credentials and the state API reported Redis storage. Production checks use reads only and preserve the participant session.

Release validation passed 225 web tests across 25 files, 10 Garmin build contracts, the standalone prototype tests, TypeScript and the production build. Stale generated route types from the removed pages were cleared before the successful build and type check. The native commit records 38 passing simulator tests; native simulator and physical-watch tests were not rerun for this web deployment. Documentation and release maintenance were assisted by Codex.

| Change | Evidence |
| :--- | :--- |
| Plain-text levels and private upload refusal logs | [Red: `60f2e85`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/60f2e85) · [Green: `902e406`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/902e406) |
| Native serialization and saved/not-saved display | [Red: `a2e5375`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/a2e5375) · [Green: `a44c648`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/a44c648) |
| Design, review fixes and proposed evaluation | [25 October design report](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/design/2026-10-25-biometrics-during-shifts.md) |

The explicit [Vercel redeployment](https://vercel.com/andhikanayakaaws-projects/offshift/FRXoFGQjG8DuAK4Y8SKSaktSV1nT) reached Ready and was assigned to the public URL; the [source commit's GitHub validation](https://github.com/AndhikaNayakaAW/DECO2850-team-project/actions/runs/40187651710) passed. The [deployment guide](Deployment) describes Git-triggered releases and publishing this wiki's separate repository. Web deployment does not install the native watch build or verify sensor delivery.

## Earlier weekly contribution · 20 October 2026

**Contributor:** Andhika Nayaka Arya Wibowo (`AndhikaNayakaAW`)
**Date:** 20 October 2026 · Australia/Brisbane
**Starting release:** `ea91157` · **Fix:** `9465c22`

I tested the existing fēnix 8 47mm application after an available phone was paired. Unlike the previous session's simulator and synthetic API checks, this test observed fresh production watch contacts while the simulator was isolated on a local file-backed server. A synthetic Connection Test request appeared on the physical watch, and the owner's confirmed Take it action produced one accepted reply and exactly one shift in the shared calendar. The owner initially reported decline, but clarified that the actual confirmation said Take it; the server outcome matched that choice.

I verified delivery of available Garmin bands without publishing their values. The production record identified Garmin as its source and contained two available signal bands. This establishes delivery of the available data during the test, not accuracy of every signal, continuous collection or a health outcome. I removed only the synthetic request, its shift and linked messages, preserving the current session and wearable record.

I found a missing-data edge case during testing: with sharing enabled and no sensor readings available, the watch constructed a timestamp-only health upload. The API rejected that request with HTTP 400, which the watch could present as a calendar failure. I added an observed failing regression in `6e81a03`, then fixed foreground and background behavior in `9465c22`. The watch now fetches the calendar without sending health when no reading exists. A band value of zero remains valid. The native suite increased from 24 to 26 passing tests, with all physiological thresholds unchanged.

I compiled the protected production release and transferred it through MTP. The 37,452-byte file downloaded back from the watch exactly matched the compiled SHA-256. The owner reports the updated app opens and shows Synced; fresh post-transfer server contact is recorded separately in the installation evidence. No existing files were deleted, and an earlier verified release remains privately backed up. Because a running Offshift installation was not exposed as a PRG in the MTP Apps folder, I corrected the earlier claim that an empty PRG listing proved a fresh installation.

The web suite passed 200 tests across 20 files, the production build and TypeScript check passed, and all nine Node build checks passed. GitHub validation and automatic Vercel deployment of `9465c22` succeeded. Native changes must still be compiled and installed on the watch; a Git push deploys the website, not the watch binary. Implementation, test execution and documentation were assisted by Codex.

| Commit | Evidence |
| :--- | :--- |
| [`6e81a03`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/6e81a03) | Red: 25 native tests pass; the new missing-reading assertion errors. The zero-band guard passes. |
| [`9465c22`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/9465c22) | Green: skip empty health uploads in foreground/background; all 26 native tests pass. |

[GitHub validation](https://github.com/AndhikaNayakaAW/DECO2850-team-project/actions/runs/39378758379) · [Vercel deployment](https://vercel.com/andhikanayakaaws-projects/offshift/9B4dDGrQ3dPpRY7dqbU9G3fcCW1C)

Long-term stability, exact background scheduling, battery use, all sensor types, all physical answer variants and worker outcomes still require evaluation. The shared access code remains a prototype boundary rather than separate employer and worker accounts.

## Earlier records

[19 October: Garmin theme, cloud and five TDD cycles](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/contributions/2026-10-19-garmin-cloud-ui.md) · [15 October: browser reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/contributions/2026-10-15-watch-reflection.md).
