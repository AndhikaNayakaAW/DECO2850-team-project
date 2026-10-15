[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment) · [Watch & reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection) · [Weekly contribution](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution)

# Testing & TDD

Tests protect the behaviour the worker sees: what an offer overlaps, what it pays, how replies read, and whether interactions need confirmation.

## Run the checks

From `offshift-phone/`:

```bash
npm ci
npm test
npm run typecheck
npm run build
```

For the standalone prototype, from the repository root:

```bash
node --test prototype/offshift.logic.test.js
```

For a short development loop:

```bash
npm run test:watch
```

The phone application suite currently has **67 tests across 8 files**. This count includes the watch-reflection change; add meaningful regression tests as behaviour expands.

## What is covered

| Suite | Behaviour |
| :--- | :--- |
| `watch.test.ts` | Fifteen import, provenance, date and activity-context tests. |
| `watch-store.test.ts` | Six private-state, persistence, confirmation and deletion tests. |
| `logic.test.ts` | Time conversions, income, overlaps, impact calculations and overnight regression cases. |
| `checks.test.ts` | Body / Week / Money, priority ordering, reply drafts, alternatives and travel. |
| `assistant.test.ts` | Scripted greetings, briefings, day queries and decisions. |
| `gestures.test.ts` | Gesture dwell times, latching and cursor snapping. |
| `hands.test.ts` | Landmark classification and fist-versus-pinch behaviour. |
| `store.test.ts` | An accepted ask becomes a shift; reset restores the scenario. |

## A real test-first change

**Problem:** a Thursday 22:00–02:00 shift with a 30-minute unpaid break was counted as zero paid minutes. Next-day commitments could be missed and rest could be measured from the wrong finish time.

| Phase | Evidence |
| :--- | :--- |
| **Red — tests first** | Six overnight tests were added; five failed against the previous implementation. The empty-duration/break guard already passed. |
| **Green — implementation** | Paid time now counts 210 minutes and income at $32/hour is $112. Conflict and rest calculations use intervals crossing midnight. All 46 tests pass. |
| **Review** | Type checking and the production build pass. A pre-existing dynamic-filesystem tracing warning remains in `/api/state`. |

The regressions cover clocks on both sides of midnight, exact endpoint contact, empty intervals, excessive breaks, commitments starting the previous night, and a Sunday-to-Monday shift.

Equal clocks deliberately represent zero duration, not a 24-hour shift. Weekly labels are scenario data, not full production dates or timezone rules.

## Contributing with TDD

1. Describe one observable failure or new behaviour.
2. Add a focused test and run it against the unchanged implementation.
3. Commit the test with the actual failing result in the commit body.
4. Implement the smallest coherent fix and run the relevant suite.
5. Run type checking and the build, then commit the passing implementation.
6. Refactor when it improves clarity, keeping the tests green.

Use your configured Git identity for your own commits. Keep original human authorship intact and do not invent test results or backdate commits.

Unit tests do not establish browser accessibility, network-race correctness or production privacy. Exhibition checks should also cover touch alternatives, permission refusal and resetting between participants.

**Next:** [Validate a release](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment).

## Watch reflection: test-first delivery

The watch work added 21 contract tests before implementation. Against the explicit contract stubs, **12 tests failed and 9 guard cases passed**. The next commit implemented the adapter and private store, making all **67 tests pass**. Type checking and production builds also passed.

A browser walkthrough checked 13 groups of behaviour: round watch frame, two watch screens, mobile overflow, activity/readings matching, reflection persistence, recovery preview/cancel, recovery confirmation, recovery persistence, import date matching, unverified provenance, confirmed deletion, exclusion from shared API requests and absence of browser exceptions. These checks use synthetic values, not device or worker evidence.

The GitHub Actions workflow runs on main pushes and pull requests with locked dependencies and Node 24. It runs tests, type checking, the production build and the standalone prototype check. The Vercel Git integration deploys independently; no branch protection or CI-before-deployment gate is claimed.
