<p align="center"><img src="https://raw.githubusercontent.com/AndhikaNayakaAW/DECO2850-team-project/main/docs/wiki/assets/banner.svg" alt="Offshift — a little room between work and life. Seven columns represent a week of work, study, plans and protected rest." width="100%" /></p>

<p align="center"><strong>DECO2850 · Care studio · Project handbook</strong></p>

[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment) · [Watch & reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection) · [Weekly contribution](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution)


## Your week. Your call.

Offshift explores how casual workers can reflect on work alongside their energy, rest and other commitments. The current prototype combines a dated 3D calendar with a native Garmin watch app. The worker chooses what to share and when to send a reply. The proposed care focus still needs worker evaluation.

**[Open the calendar ↗](https://offshift-nine.vercel.app/calendar)**

## Current release · 20 October 2026

The fēnix 8 47mm has completed a physical request/reply round trip through the paired phone to Vercel and Redis, and available Garmin bands arrived. A missing-reading upload bug was reproduced and fixed with TDD; all 26 native, 200 web and nine build tests pass. The corrected watch transfer matches its readback hash.

| Explore | What you will find |
| :--- | :--- |
| **[01 / Get started](Getting-Started)** | Current routes, an empty session and the research walkthrough. |
| **[02 / Design and research](Design-and-Research)** | The care question, earlier design rationale and questions for workers. |
| **[03 / Architecture](Architecture)** | Garmin Connect, Vercel, Redis and where body data goes. |
| **[04 / Testing and TDD](Testing-and-TDD)** | Five observed red/green cycles and the verification limits. |
| **[05 / Deployment](Deployment)** | Git deployment, free Redis, access protection and native builds. |
| **[06 / Watch and reflection](Watch-and-Reflection)** | Four native pages, worker controls and the removed browser reflection. |
| **[07 / Weekly contribution](Weekly-Contribution)** | Dated changes, commits, screenshots, evidence and remaining hardware work. |

## One session, three answers

The researcher starts a session and sends an ask. The worker sees it beside the week, inspects context, chooses **Accept**, **Decline** or **Later**. Accepting adds the shift, declining takes the ask off the week, and later keeps it there, see-through, until they decide. No message goes to the manager. Personal body readings do not become an employer explanation.

The deployment holds one shared session at a time. The shared access code is supplied privately. The team API omits body data and plans, but the prototype does not have separate employer and worker accounts.

## Course history

The mobile prototype, September demonstration scenario and earlier phone interface remain in the repository as iteration evidence. The current app uses real dates in Australia/Brisbane and starts with an empty week.

[Research notes](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/pleasure-framework-iteration.md) · [Original HTML prototype](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/prototype/offshift.html) · [Source code](https://github.com/AndhikaNayakaAW/DECO2850-team-project)
