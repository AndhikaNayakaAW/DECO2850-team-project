<p align="center"><img src="https://raw.githubusercontent.com/AndhikaNayakaAW/DECO2850-team-project/main/docs/wiki/assets/banner.svg" alt="Offshift — a little room between work and life. Seven columns represent a week of work, study, plans and protected rest." width="100%" /></p>

<p align="center"><strong>DECO2850 · Care studio · Project handbook</strong></p>

[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment) · [Watch & reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection) · [Weekly contribution](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution)


## Your week. Your call.

Offshift explores how casual workers can reflect on work alongside their energy, rest and other commitments. The current prototype combines a dated 3D calendar with a native Garmin watch app and an optional daily reflection view. The worker chooses what to share and when to send a reply. The proposed care focus still needs worker evaluation.

**[Open the calendar ↗](https://offshift-nine.vercel.app/calendar)** · **[Daily reflection ↗](https://offshift-nine.vercel.app/calendar?view=day)** · **[Circular browser preview ↗](https://offshift-nine.vercel.app/watch)**

## Current release · 19 October 2026

The fēnix 8 47mm app now uses the calendar's cream and forest-green theme. Its release builder targets protected Vercel HTTPS independently of old laptop settings. Production has free Redis storage and a shared access code. A Git push automatically deployed the release; 200 web tests, 24 native simulator tests, 9 build contracts and 17 synthetic live API checks passed. Physical watch installation remains pending a stable MTP connection.

| Explore | What you will find |
| :--- | :--- |
| **[01 / Get started](Getting-Started)** | Current routes, an empty session and the research walkthrough. |
| **[02 / Design and research](Design-and-Research)** | The care question, earlier design rationale and questions for workers. |
| **[03 / Architecture](Architecture)** | Garmin Connect, Vercel, Redis and the two watch-data paths. |
| **[04 / Testing and TDD](Testing-and-TDD)** | Five observed red/green cycles and the verification limits. |
| **[05 / Deployment](Deployment)** | Git deployment, free Redis, access protection and native builds. |
| **[06 / Watch and reflection](Watch-and-Reflection)** | Four native pages, circular browser preview and worker controls. |
| **[07 / Weekly contribution](Weekly-Contribution)** | Dated changes, commits, screenshots, evidence and remaining hardware work. |

## One session, five responses

The researcher starts a session and sends an ask. The worker sees it beside the week, inspects context, chooses **Take it**, **Another time**, **Ask for a swap**, **Not now** or **Decide later**, then confirms a reply. Accepting adds the shift. Personal body readings do not become an employer explanation.

The deployment holds one shared session at a time. The shared access code is supplied privately. The team page omits body data and plans, but the prototype does not have separate employer and worker accounts.

## Course history

The mobile prototype, September demonstration scenario and earlier phone interface remain in the repository as iteration evidence. The current app uses real dates in Australia/Brisbane and starts with an empty week. A practice week and synthetic browser readings must be loaded explicitly.

[Research notes](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/pleasure-framework-iteration.md) · [Original HTML prototype](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/prototype/offshift.html) · [Source code](https://github.com/AndhikaNayakaAW/DECO2850-team-project)
