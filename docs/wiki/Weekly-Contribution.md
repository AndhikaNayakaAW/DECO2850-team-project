[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment) · [Watch & reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection) · [Weekly contribution](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution)

# Weekly contribution — watch and reflection

**Contributor:** Andhika Nayaka Arya Wibowo (`AndhikaNayakaAW`)  
**Week:** 12–18 October 2026 · Australia/Brisbane  
**Recorded:** 15 October 2026

## Contribution summary

I translated tutor feedback into a narrower browser prototype: helping casual workers reflect on how work fits with their energy, rest and other commitments. I built a circular watch preview, connected timestamped demo or imported heart-rate readings to a simple daily calendar, added an optional private reflection, and implemented a worker-confirmed recovery action. I kept the earlier 3D and immersive views available as alternatives instead of adding more gestures or manager features.

This is a proposed focus to evaluate with workers. I have not established reduced stress, improved reflection or any relationship between heart rate and work. The native Garmin application is my teammate's contribution and has not been pushed or integrated in this release. My work provides the browser experience and a provisional, tested file-import adapter for that handoff.

## Commit evidence

| Commit | Phase | Change |
| --- | --- | --- |
| [`ceafd1f`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/ceafd1f) | Earlier this week · red | Reproduce overnight shift pay and calendar errors with tests. |
| [`759814d`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/759814d) | Earlier this week · green | Fix overnight pay, dated conflicts and rest calculations. |
| [`70f2b13`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/70f2b13) | Earlier this week · documentation | Create and publish the modern Offshift wiki. |
| [`716e5f6`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/716e5f6) | Watch work · red | Add 21 domain/store contract tests before implementation; 12 fail and 9 guards pass. |
| [`931bc77`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/931bc77) | Watch work · green | Implement validated imports, explicit provenance, date matching and private reflection state; all 67 tests pass. |
| [`fe6d698`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/fe6d698) | Watch work · interaction | Build /watch, the daily calendar, optional notes and preview/cancel/confirm recovery flow; retain optional 3D. |
| [`0767080`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/0767080) | Watch work · delivery | Add GitHub validation and explicitly enable the existing Vercel Git deployments. |

| [`42b8776`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/commit/42b8776) | Watch work · QA refinement | Clarify the cleared-data state after deletion and verify it in the browser walkthrough. |

The accompanying documentation commit records this report, source screenshots, the browser walkthrough, wiki updates and the integration handoff. The final documentation and separate wiki publication hashes are reported in chat after publication. Existing human authorship is preserved.

## What changed and why

| Tutor feedback | Implemented response | Limit to report honestly |
| --- | --- | --- |
| Narrow the purpose. | Watch → dated activity → optional reflection → chosen action. | Proposed design direction, not a research finding. |
| Make watch data visible. | One metric: heart rate, recording timestamp, source and import/demo sync metadata. | Default readings are synthetic. Imports are unverified files. There is no live Garmin feed yet. |
| Offer a clearer calendar. | Daily timeline is the default, with work, study, personal plans and readings together. | The activity scenario is dated 14–20 September 2026; other import dates are not relabelled to match it. |
| Allow context. | A 500-character optional reflection on the selected activity. | Notes are worker-written; readings never generate a stress or tiredness label. |
| Support worker-controlled action. | Preview a recovery block, Cancel or Confirm; confirmation adds one private block. | The work roster remains as booked; no roster-edit action was introduced. |
| Keep information private and controllable. | Separate browser storage, hide readings, replace imports, and confirmed deletion. | Browser storage is not encryption or authenticated account isolation. Separate devices do not share watch data. |
| Make changes deploy reliably. | Verified the existing GitHub/Vercel link, enabled Git deployments explicitly, and added GitHub validation. | GitHub checks and Vercel deployment run independently; no deployment gate is claimed. |

## Demonstrated interaction flow

1. Open **/watch** and inspect the circular watch face. The source is visibly Demo data.
2. Switch between **Reading** and **Reflect**.
3. Choose **Reflect on my day** to open **/calendar?date=2026-09-16**.
4. Select the Wednesday McDonald's **12–4 pm** shift and inspect the five readings within its activity window.
5. Optionally write how the activity felt and save the reflection in this browser.
6. Preview **4:30–5 pm recovery time**. Cancel leaves the timeline unchanged.
7. Confirm to add one private recovery block; it survives navigation.
8. Hide readings or confirm deletion of readings, reflections and recovery blocks from the watch page.

## TDD and verification evidence

- Existing suite before this work: **46 passing tests across 6 files**.
- Red commit: **21 new tests**, producing **12 failures and 9 passing guards** against explicit contract stubs.
- Green commit: **67 passing tests across 8 files**.
- New tests cover import rejection, explicit provenance, source/recording/import timestamps, Brisbane dates, overnight activity windows, private optional notes, preview/confirmation, persistence and deletion.
- TypeScript and production builds pass. An existing dynamic-filesystem tracing warning remains in `/api/state`.
- The local production browser walkthrough passes **13 groups of checks**, including circular dimensions, mobile overflow, activity/readings matching, saving optional notes, cancellation, confirmed recovery, import matching, confirmed deletion and no runtime exceptions.
- Captured shared API requests did not contain the private test note or imported reading ID. This is a scoped prototype check, not a production security audit.

The browser checks use synthetic data. Screenshots and sample reflections below are walkthrough fixtures, not participant evidence.

[Browser-check result](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/contributions/assets/watch-browser-checks.json) · [Reproducible browser walkthrough](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/scripts/check-watch-browser.mjs)

![Desktop circular watch preview](https://raw.githubusercontent.com/AndhikaNayakaAW/DECO2850-team-project/main/docs/contributions/assets/watch-desktop.png)

<details><summary>Mobile watch view and daily calendar screenshots</summary>

<img src="https://raw.githubusercontent.com/AndhikaNayakaAW/DECO2850-team-project/main/docs/contributions/assets/watch-mobile.png" alt="Circular watch preview at a 390-pixel mobile width" width="390" />

![Daily calendar with a synthetic reflection](https://raw.githubusercontent.com/AndhikaNayakaAW/DECO2850-team-project/main/docs/contributions/assets/calendar-desktop.png)

</details>

## Wiki and documentation delivered

- New **Watch & reflection** page: walkthrough, JSON contract, provenance labels, privacy boundaries and native-app handoff.
- New **Weekly contribution** page: this report and commit evidence.
- Updated Home, Getting Started, Architecture, Testing & TDD, Deployment and sidebar navigation.
- Updated application/root READMEs and the wiki publisher so the new pages are versioned with the code.

## What remains for the team

1. Merge the teammate's native Garmin application while preserving their authorship.
2. Confirm which measurement it actually provides and inspect its real payload. Agree on transport and adapt that payload rather than assuming the provisional JSON already matches.
3. Test real-device source, timestamp accuracy, freshness and end-to-end delivery. The current file import is not a claim of a live watch connection.
4. Show workers daily and 3D alternatives, ask neutral questions, and investigate whether the complete reflection/action flow is useful or uncomfortable.
5. Address durable storage and authenticated isolation before any cross-device use of real worker readings.

## Release flow

```text
Test contracts → observe failure → implement adapter/private store → pass tests
    → build responsive views → exercise browser flow → record evidence
    → push main → GitHub validation + Vercel build independently
    → verify production routes → publish updated wiki
```

The live deployment result is verified and reported in the accompanying chat; this document does not invent an outcome before the remote build completes.
