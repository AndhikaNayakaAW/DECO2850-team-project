[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment) · [Watch & reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection) · [Weekly contribution](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution)

# Weekly contribution · 19 October 2026

**Contributor:** Andhika Nayaka Arya Wibowo (`AndhikaNayakaAW`)
**Week:** 19–25 October 2026 · Australia/Brisbane
**Recorded:** 19 October 2026
**Starting point:** teammate release `bcfbc85`

## Contribution narrative

I pulled the latest team implementation and extended the existing native Garmin application for the confirmed fēnix 8 47mm. My teammate had already implemented the native app, sensor mapping, dated calendar, team session controls, access-code support and Redis-compatible server. My contribution focused on making the watch UI consistent with the calendar, preparing a reliable private cloud build, configuring the deployment and documenting evidence. I preserved the teammate's authorship and the existing unrelated lockfile edit. Implementation, test execution and documentation were assisted by Codex.

I changed the four watch pages to use the calendar's cream background, forest-green text, warm accent and paper cards. Cached vector fonts establish a clearer hierarchy while keeping long names and times inside the circular display. Page indicators show the position in the four-page flow, and the answer and sharing menus use Garmin's green theme. I also updated the glance and shortened the first-run consent prompt after simulator review showed the original wording was truncated. The browser `/watch` caption now distinguishes its file-import preview from Garmin synchronization on the calendar.

I replaced laptop-oriented release defaults with a production HTTPS build workflow. The builder validates the site address, normalizes links such as `/calendar`, accepts a private access-code file and supports explicit HTTP loopback simulation. It prepares temporary source and resources, embeds the selected endpoint there, prints only the public origin and removes the temporary files afterward. The signing key and private environment stay outside Git; the ignored watch binary has owner-only permissions. During simulator testing I discovered that Garmin retained the old `baseUrl` property after a sideload. I reproduced that problem in a native regression, then made the installed build use its compiled endpoint independently of that retained setting.

I configured the existing Vercel project with an Upstash Redis database named `offshift-week` on the free plan, with automatic paid upgrades and the production add-on disabled. I connected it to Production and configured a private shared access code as a Vercel secret. The existing server's compare-and-set storage can now synchronize the calendar, team page and watch across Vercel instances. The deployed route is watch → paired phone running Garmin Connect → internet → Vercel → Redis. After installation this architecture does not require the laptop or a tunnel; the paired phone and internet connection are still needed for the communication bridge.

I used four observed red/green cycles. These covered secure build configuration, readable watch theming, sync status and explicit confirmation, and migration away from retained laptop settings. The sync regression also fixed a case where a successful reply left an old offline message on screen. Safety tests verify that cancelling sends nothing, a confirmed reply sends the chosen decision, and a failed send retains the ask and last successful sync. The physiological thresholds from the teammate's implementation were not changed.

The first eight commits were pushed together, and GitHub validation passed. That Git push automatically deployed the web app to Vercel. I then ran 17 synthetic checks against the live protected API: unauthorized requests were rejected; browser login set a secure HttpOnly cookie; storage reported Redis; a team ask reached the protected watch route; two simultaneous accept requests produced one success and one conflict; and the calendar contained exactly one resulting shift. I also verified synthetic health-band delivery, omission of health and plans from the team response, and deletion when sharing was switched off. I cleared the synthetic session to an empty week afterward.

I updated the wiki's home page, getting-started guide, architecture, deployment instructions, watch/reflection guide, testing guide and weekly contribution record. The new instructions use the actual current routes: `/calendar` is the dated 3D week and `?view=day` opens daily reflection. They distinguish the native shared band data from the browser-only numeric import and reflection store. Earlier September phone/demo claims are now identified as course history rather than current behavior.

## Commit evidence

| Commit | Phase | Change |
| :--- | :--- | :--- |
| [`386fc01`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/386fc01) | Red | Define HTTPS, URL normalization and private endpoint contracts; six failures and one passing guard. |
| [`1ef216c`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/1ef216c) | Green | Implement the release builder and production defaults; all seven build contracts pass. |
| [`65eb9dc`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/65eb9dc) | Red | Add native ground, branding and contrast assertions; three new failures. |
| [`13725fe`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/13725fe) | Green | Apply the calendar theme, cached vector type, paper cards, native green menus and page indicators; 18 native tests pass. |
| [`2766f73`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/2766f73) | Red | Reproduce stale offline status and an opaque access error; 21 tests pass and two fail. |
| [`3db074d`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/3db074d) | Green | Clear stale status after a successful reply and explain access failures; 23 native tests pass. |
| [`6d45f43`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/6d45f43) | Red | Reproduce a retained laptop URL overriding an updated sideload. |
| [`8b67263`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/8b67263) | Green | Embed the build endpoint independently of retained settings; all 24 native tests pass. |
| [`89420fd`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/89420fd) | UI refinement | Shorten consent text, match the glance to the calendar and clarify the browser preview boundary. |

The accompanying documentation commit records this report, native simulator screenshot, raw native test output, production-check results and wiki source. Its hash and the separate wiki publication hash are recorded in Git history and the handoff message; they are not invented in advance.

## Interaction and data flow

The researcher starts a session and sends an ask from `/team`. The worker sees that ask on the calendar and on the watch's Ask page, then can inspect the surrounding week and optional body words. They choose one of five responses. A reply reaches the server only through the confirmation path; deciding later sets a reminder without a manager message. Accepting creates a shift in the calendar, while the team page sees the response. A failed reply remains available to retry.

Body sharing is optional. Raw values remain on the watch, while the server receives timestamped bands encoded 0–3 and displays words. Sharing-off removes the shared wearable record. The team projection excludes the worker's body data and private plans. This is still one shared session behind one code, without separate participant accounts or employer/worker API roles; the team screen's restricted response is not a claim of full role isolation.

The circular browser `/watch` preview is a separate interaction study. It accepts explicitly loaded synthetic readings or unverified file imports, and its numeric readings, reflections and confirmed recovery blocks remain in browser storage. It does not pair with the physical watch. A physiological reading does not establish stress, tiredness caused by work or a clinically meaningful conclusion. The proposed reflection focus and any reduction in stress still require worker evaluation.

## Verification evidence

| Check | Observed result |
| :--- | :--- |
| Web tests | 200 tests across 20 files passed. |
| TypeScript and production build | Both passed; current app routes generated successfully. |
| Native simulator | 24 tests passed on the `fenix847mm` profile. |
| Build configuration | All 7 Node contracts passed; included in GitHub Actions. |
| Standalone prototype | Existing logic check passed. |
| Live production API | 17 synthetic checks passed; test session cleared. |
| GitHub CI after first push | [Successful run](https://github.com/AndhikaNayakaAW/DECO2850-team-project/actions/runs/39259454484). |
| Automatic production deployment | [Successful deployment](https://vercel.com/andhikanayakaaws-projects/offshift/E716bF3huNfhVXS4pnwA3jcwNNhB) of `8b67263`. |
| Native visual review | Refreshed Ask page inspected in Garmin's simulator with an isolated practice session. |
| Physical installation | Pending: USB device visible, but no MTP app-storage interface available. |

[Native simulator output](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/contributions/assets/garmin-native-tests-2026-10-19.txt) · [Production check record](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/contributions/assets/garmin-production-verification-2026-10-19.json)

![Native Garmin simulator with a synthetic shift ask](https://raw.githubusercontent.com/AndhikaNayakaAW/DECO2850-team-project/main/docs/contributions/assets/garmin-ask-simulator.png)

*Simulator capture using a synthetic Alex/Cafe ask. It is not a photograph of the physical watch and does not prove real sensor delivery.*

## Remaining hardware verification

The model was confirmed by the owner and the native release compiled successfully with the fēnix 8 47mm profile. The Mac detects Garmin USB ID `091e:0003`, but libmtp reports no devices and the watch does not expose its app files. No existing watch app has been overwritten, and no physical installation or real sensor-to-calendar delivery is claimed. The private release is prepared for installation once MTP access is available.

After that connection is available, back up only the installed Offshift program, replace only Offshift, unplug the watch and open the app with the paired phone online. Verify a new watch contact timestamp, one real reading with consent, an ask and an explicitly confirmed reply. The current live API contact time includes synthetic verification requests, so it cannot itself be reported as physical-device evidence. Worker evaluation and comfort on the wrist remain separate from technical tests.

## Earlier contribution

[12–18 October: browser watch, reflection and recovery](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/contributions/2026-10-15-watch-reflection.md). That dated record describes the implementation at the time, before the teammate pushed the native Garmin redesign.
