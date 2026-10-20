# Weekly contribution follow-up · physical Garmin testing

**Contributor:** Andhika Nayaka Arya Wibowo (`AndhikaNayakaAW`)
**Date:** 20 October 2026 · Australia/Brisbane
**Starting release:** `ea91157` · **Fix:** `9465c22`

I tested the existing fēnix 8 47mm application after an available phone was paired. Unlike the previous session's simulator and synthetic API checks, this test observed fresh production watch contacts while the simulator was isolated on a local file-backed server. A synthetic Connection Test request appeared on the physical watch, and the owner's confirmed Take it action produced one accepted reply and exactly one shift in the shared calendar. The owner initially reported decline, but clarified that the actual confirmation said Take it; the server outcome matched that choice.

I verified delivery of available Garmin bands without publishing their values. The production record identified Garmin as its source and contained two available signal bands. This establishes delivery of the available data during the test, not accuracy of every signal, continuous collection or a health outcome. I removed only the synthetic request, its shift and linked messages, preserving the current session and wearable record.

I found a missing-data edge case during testing: with sharing enabled and no sensor readings available, the watch constructed a timestamp-only health upload. The API rejected that request with HTTP 400, which the watch could present as a calendar failure. I added an observed failing regression in `6e81a03`, then fixed foreground and background behavior in `9465c22`. The watch now fetches the calendar without sending health when no reading exists. A band value of zero remains valid. The native suite increased from 24 to 26 passing tests, with all physiological thresholds unchanged.

I compiled the protected production release and transferred it through MTP. The 37,452-byte file downloaded back from the watch exactly matched the compiled SHA-256. The owner reports the updated app opens and shows Synced; fresh post-transfer server contact is recorded separately in the installation evidence. No existing files were deleted, and an earlier verified release remains privately backed up. Because a running Offshift installation was not exposed as a PRG in the MTP Apps folder, I corrected the earlier claim that an empty PRG listing proved a fresh installation.

I created a [screen-by-screen testing PDF](../testing/garmin-2026-10-20/Offshift-Garmin-Testing-2026-10-20.pdf) covering the four pages, body details, sharing, answer menus, confirmations, reply states and connection failures. Every watch image is explicitly identified as a native simulator capture using synthetic data. Physical validation is supported separately by server observations and owner reports. The PDF generator, screenshots, raw native test logs and sanitized evidence are checked into the repository so the document can be reviewed and regenerated.

The web suite passed 200 tests across 20 files, the production build and TypeScript check passed, and all nine Node build checks passed. GitHub validation and automatic Vercel deployment of `9465c22` succeeded. Native changes must still be compiled and installed on the watch; a Git push deploys the website, not the watch binary. Implementation, test execution and documentation were assisted by Codex.

| Commit | Evidence |
| :--- | :--- |
| [`6e81a03`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/6e81a03) | Red: 25 native tests pass; the new missing-reading assertion errors. The zero-band guard passes. |
| [`9465c22`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/9465c22) | Green: skip empty health uploads in foreground/background; all 26 native tests pass. |

[Physical evidence and test procedure](../testing/garmin-2026-10-20/README.md) · [GitHub validation](https://github.com/AndhikaNayakaAW/DECO2850-team-project/actions/runs/39378758379) · [Vercel deployment](https://vercel.com/andhikanayakaaws-projects/offshift/9B4dDGrQ3dPpRY7dqbU9G3fcCW1C)

Long-term stability, exact background scheduling, battery use, all sensor types, all physical answer variants and worker outcomes still require evaluation. The shared access code remains a prototype boundary rather than separate employer and worker accounts.
