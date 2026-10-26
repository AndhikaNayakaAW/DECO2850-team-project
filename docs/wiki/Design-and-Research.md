[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment) · [Watch & reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection) · [Weekly contribution](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution)

# Design & research

Offshift is a reflective tool for students in casual work. The current prototype joins a dated 3D week, one post-shift work rating and optional stress/heart readings from the shift itself. When a new ask arrives, past shifts at that workplace sit beside the surrounding commitments. The worker chooses Accept, Decline or Later; no manager message is sent.

## The moment we are designing for

An extra shift arrives. Before deciding, a student weighs coursework, rent, travel, rest and a manager they may feel guilty disappointing. The design evidence comes from **five semi-structured interviews with university students in casual work in Brisbane**. Participant IDs P1–P5 appear in the [Pleasure Framework research document](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/pleasure-framework-iteration.md).

Dinda Pratiwi is a composite persona: a 21-year-old international undergraduate balancing retail shifts, study, essential expenses and personal commitments. Scenario names, workplace details and dollar figures in the earlier prototype are illustrative.

## Current design · late October

The tutor's feedback led to three connected pieces: calendar, check-in and readings during shifts. The watch asks **How was the work?** with Light, Steady, Busy, Hard or Skip. Its optional heart/stress history becomes neutral grey 15-minute strips on that shift. A new ask shows the recent shifts at the same workplace, the worker's rating and the available readings without recommending an answer.

| Need | Current design response |
| :--- | :--- |
| See work alongside study and personal commitments. | One dated week with shifts, classes, due dates, plans and rest days. |
| Recall how a workplace's shifts went. | One rating per finished shift, and Past shifts beside the next ask. |
| Compare body readings with the shift's timing. | Stress and heart strips on the shift, with missing samples hatched. |
| Keep ownership of the decision. | Accept, Decline and Later, with deliberate watch confirmation and calendar Undo. |
| Control sharing. | Optional watch consent; sharing-off removes all shift readings. The team API excludes shifts, ratings and body data. |

Read the [shift check-in rationale](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/design/2026-10-23-shift-check-in.md), [biometrics storyboard and evaluation plan](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/design/2026-10-25-biometrics-during-shifts.md), and [reading list by feature](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/research/2026-10-25-reading-list.md).

## Four Pleasures and course history

The earlier iteration used psycho-pleasure as its primary lens: make the cognitive and emotional work around an ask easier. Physio-pleasure informed rest and recovery; socio-pleasure informed negotiation; ideo-pleasure informed honesty and care without surveillance. The [original mapping](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/docs/pleasure-framework-iteration.md) remains design history.

Reply drafts, five response options, the Fine/Tired/Wiped check-in, voice assistant and browser reflection belong to earlier iterations. The current implementation uses three answers, one work rating, no voice and one calendar screen.

## Design commitments

- Show commitments and past experience without a verdict or recommended answer.
- Treat rest as a commitment.
- Keep missing readings visibly missing and separate the worker's rating from watch readings.
- Read sensor history only for shift hours, with the worker's sharing choice.
- Provide touch and keyboard alternatives to optional hand gestures.

The public prototype holds one shared week and currently opens without a code. Its filtered team response is not separate employer/worker account authorization. Technical checks do not establish worker outcomes or show that work caused a physiological reading.

## Evaluate the experience

| Participant task | What to observe |
| :--- | :--- |
| Compare two finished shifts and explain the grey strips. | Can the worker distinguish rating, sensor level and missing data? |
| Rate a finished shift, then change the rating on the calendar. | Are Light, Steady, Busy and Hard useful words? |
| Open an ask from the same workplace and choose an answer. | Does Past shifts help explain a deliberate choice? |
| Turn sharing off and find what remains visible. | Are sharing and the shared-session boundary understood? |

Ask what the worker wants to understand, which view is easier, what useful action it supports and what feels uncomfortable. These are proposed evaluation tasks; the repository does not establish reduced stress or improved reflection from a completed worker study.

**Next:** [Architecture](Architecture) · [Watch and reflection](Watch-and-Reflection) · [Testing](Testing-and-TDD).
