[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment) · [Watch & reflection](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection) · [Weekly contribution](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution)

# Watch & reflection

**Proposed focus:** Offshift helps casual workers reflect on how work fits with their energy, rest and other commitments. This direction responds to tutor feedback and still needs testing with workers; reduced stress and improved reflection are not established outcomes.

**[Watch preview ↗](https://offshift-nine.vercel.app/watch)** · **[Daily reflection ↗](https://offshift-nine.vercel.app/calendar)** · **[Optional 3D week ↗](https://offshift-nine.vercel.app/calendar?view=3d)**

![Circular Offshift watch preview](https://raw.githubusercontent.com/AndhikaNayakaAW/DECO2850-team-project/main/docs/contributions/assets/watch-desktop.png)

## What is working

| Step | Interaction |
| --- | --- |
| **Notice** | A circular watch preview shows a recorded heart-rate value, recording time, source and demo/import provenance. Reading and Reflect are working screens. |
| **See context** | The daily calendar shows work, study, personal activities and timestamped readings together. Selecting an activity shows samples during it and 30 minutes either side. |
| **Add your words** | An optional 500-character reflection is saved privately in this browser. No physiological label is generated. |
| **Choose an action** | Preview a 30-minute recovery block starting 30 minutes after the activity. Cancel leaves the timeline unchanged; Confirm adds one private block. The work roster is not edited. |
| **Stay in control** | Hide readings, replace them with an imported file, explicitly load demo data, or confirm deletion of readings, reflections and recovery blocks. |

> [!IMPORTANT]
> This release is a browser preview with a tested file-import connection. The teammate's native Garmin app has not been pushed and is not integrated here. Demo readings are synthetic. Imported readings are labelled **unverified** because a pasted file cannot prove its origin. There is no live device feed, Bluetooth pairing or Garmin account connection.

## Demonstration flow

1. Open `/watch`. The default fixture is Wednesday 16 September 2026 and is labelled Demo data.
2. Switch between **Reading** and **Reflect** on the circular watch face.
3. Choose **Reflect on my day** to open `/calendar?date=2026-09-16`.
4. Select the McDonald's 12–4 pm shift. Five demo readings appear in its context window.
5. Add a short reflection and select **Save reflection**; leaving it empty is allowed.
6. Select **Preview recovery time**. Review the proposed 4:30–5 pm block.
7. Choose **Cancel**, or **Confirm recovery time** to add the private block.
8. Return to `/watch` to manage visibility or delete the private data.

The daily timeline is the default calendar. The earlier 3D calendar is at `/calendar?view=3d`; `/calendar?immersive=1` retains the immersive exhibition view.

## File-import contract for the Garmin handoff

The adapter lives in [`src/lib/watch.ts`](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/offshift-phone/src/lib/watch.ts). It accepts this provisional JSON structure:

```json
{
  "version": 1,
  "device": "Garmin device label from the export",
  "readings": [
    {
      "id": "sample-001",
      "recordedAt": "2026-09-16T14:20:00+10:00",
      "bpm": 96
    }
  ]
}
```

The sample above illustrates the format; it is not a real watch measurement. Open **Import a watch export**, paste the JSON, then choose **Import to this browser**. Import replaces the current reading batch instead of mixing it with demo readings. Invalid imports leave the previous batch intact.

| Field | Contract |
| --- | --- |
| `version` | Exactly `1`. |
| `device` | A non-empty self-reported source label, maximum 100 characters. |
| `readings` | Between 1 and 5,000 samples. |
| `id` | Unique non-empty identifier within the batch, maximum 80 characters. |
| `recordedAt` | Valid ISO timestamp with seconds and `Z` or an explicit timezone offset. |
| `bpm` | Finite number greater than zero and no greater than 300. This is an input constraint, not a health classification. |

The browser adds `origin: imported`, `source` and an import receipt timestamp. Samples are sorted by recording time. Extra fields such as stress labels are discarded. All calendar matching uses **Australia/Brisbane** dates. Imports from October are never silently attached to September's demo activities.

When the teammate pushes the native app, inspect its actual measurements and payload, agree on a transport, and map its output into this adapter. Do not assume that this JSON format is already implemented by the native app. A real device test is still needed to establish source, freshness and end-to-end delivery.

## Privacy boundary

Watch readings, new reflections and recovery blocks use the separate localStorage key `offshift-private-watch-v1`. They are excluded from the shared `DataSlice`, `/api/state`, manager views and assistant context. LocalStorage is browser storage, not encryption or an authenticated private account. People with access to this browser can access its local data.

The watch preview does not start a sensor or background collection. Visibility controls affect display, and deletion removes the private contents. Cross-device watch sync is deliberately not claimed; separate devices do not share these local records.

The older shared calendar remains a fictional multi-device demo with an unauthenticated API. This change does not retrofit production access control onto that API.

## Evidence and evaluation

The 21 new domain/store tests cover import validation, provenance, recording dates, overnight context, optional notes, persistence, confirmation and deletion. The browser walkthrough checks the circular display, mobile overflow, imports, cancellation, recovery persistence and exclusion from shared requests. See [Testing & TDD](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) and the [weekly contribution record](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution).

Next, show workers the daily and 3D alternatives and ask: “What would you want to understand from this information?”, “Which view is easiest to understand?”, “Does this help you do anything useful?” and “What feels unnecessary or uncomfortable?” Test the real data connection first, then the visualization, then the complete experience. No worker evaluation results are claimed by this release.
