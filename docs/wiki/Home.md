<p align="center"><img src="https://raw.githubusercontent.com/AndhikaNayakaAW/DECO2850-team-project/main/docs/wiki/assets/banner.svg" alt="Offshift — a little room between work and life. Seven columns represent a week of work, study, plans and protected rest." width="100%" /></p>

<p align="center"><strong>DECO2850 · Care studio · Project handbook</strong></p>

[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment) · [Watch & reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection) · [Weekly contribution](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution)


## Your week. Your call.

Offshift is a reflective tool for students who work casual shifts. A calendar shows when you work; a watch shows your body. Offshift joins them: after each shift the Garmin watch asks one question ("How was the work?") and reads your heart rate and stress during that shift, and the 3D week shows both on the shift itself. When a manager asks you to cover another shift, the ask shows how your last shifts at that workplace went, so you decide from what happened rather than from memory or guilt. Nothing is decided for you, and nothing reaches the employer. The focus still needs evaluation with workers.

**[Open the calendar ↗](https://offshift-nine.vercel.app/calendar)**

## Current release · 25 October 2026

Following the tutor's feedback, Offshift has three pieces only: the calendar, the one-press check-in after a shift, and heart rate and stress during each shift, drawn on that shift. The all-day Body Battery reading, the daily floor band and the second (Fine/Tired/Wiped) rating are gone. All 212 web, 31 native and 10 build tests pass. The new watch build must be installed on the fēnix 8 before real shifts are read; see the [design rationale](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/design/2026-10-25-biometrics-during-shifts.md).

Earlier: on 20 October the fēnix 8 47mm completed a physical request/reply round trip through the paired phone to Vercel and Redis.

| Explore | What you will find |
| :--- | :--- |
| **[01 / Get started](Getting-Started)** | Current routes, an empty session and the research walkthrough. |
| **[02 / Design and research](Design-and-Research)** | The care question, earlier design rationale and questions for workers. |
| **[03 / Architecture](Architecture)** | Garmin Connect, Vercel, Redis and where body data goes. |
| **[04 / Testing and TDD](Testing-and-TDD)** | Five observed red/green cycles and the verification limits. |
| **[05 / Deployment](Deployment)** | Git deployment, free Redis, access protection and native builds. |
| **[06 / Watch and reflection](Watch-and-Reflection)** | Four native pages, the shift check-in, what the watch reads during a shift, and privacy. |
| **[07 / Weekly contribution](Weekly-Contribution)** | Dated changes, commits, screenshots, evidence and remaining hardware work. |

## One session, three answers

The researcher starts a session and sends an ask. The worker sees it beside the week, with how their last shifts at that workplace went, and chooses **Accept**, **Decline** or **Later**. Accepting adds the shift, declining takes the ask off the week, and later keeps it there, see-through, until they decide. No message goes to the manager. Personal body readings do not become an employer explanation.

The deployment holds one shared session at a time. The shared access code is supplied privately. The team API omits body data and plans, but the prototype does not have separate employer and worker accounts.

## Course history

The mobile prototype, September demonstration scenario and earlier phone interface remain in the repository as iteration evidence. The current app uses real dates in Australia/Brisbane and starts with an empty week.

[Research notes](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/pleasure-framework-iteration.md) · [Original HTML prototype](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/prototype/offshift.html) · [Source code](https://github.com/AndhikaNayakaAW/DECO2850-team-project)
