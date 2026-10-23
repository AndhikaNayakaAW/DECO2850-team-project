# Post-shift difficulty rating: research brief

Offshift, DECO2850 (UQ). Feature: when a rostered shift ends, the fēnix 8 asks "How was the shift?", the worker picks a work-context difficulty, and the answer colours that shift's block on the 3D week.

Prepared 23 Oct 2026. Every reference at the end says how far it was checked: **full text** (I read the paper), **abstract** (I read the publisher, PubMed or Crossref abstract), or **secondary** (I confirmed the paper exists through Crossref or the publisher, but its content came to me through another paper or summary). Numbers in this brief come only from sources at the first two levels unless marked otherwise. The colour checks in section 4 are my own calculations, and the script is described there so they can be re-run.

---

## Summary of design implications

1. **Ask one question, answered with one press, once per shift.** Single-question smartwatch prompts get higher compliance than phone surveys even when they interrupt about 8 times as often (Intille et al., 2016). Answers take about 5 seconds (Ponnada et al., 2021; Ponnada et al., 2022). Longer questionnaires raise burden and lower data quality, while sampling more often did not (Eisele et al., 2022).
2. **Trigger the prompt from the roster (event-contingent), but wait a short time after the rostered end rather than firing on the minute.** EMA can be tied to events as well as to the clock (Shiffman, Stone & Hufford, 2008). Notifications feel most disruptive when people are in the middle of or finishing a task, and least disruptive when they are idle or starting something new (Mehrotra et al., 2016). Workload scales are meant to be given during a task or immediately afterwards (Hart, 2006). A delay of about 10 to 15 minutes is my proposal to test, not a published number.
3. **Ask soon, because the memory of a shift is a peak-and-end summary.** Retrospective ratings of an experience track its worst moment and its final minutes, and largely ignore its length (Redelmeier & Kahneman, 1996). A rating given that night is about this shift. One given days later is mostly a memory of the worst part. The calendar block already shows duration, which covers the part memory drops.
4. **Never nag. One prompt, no re-prompt, and an unrated shift stays "Not rated" until the worker rates it on the calendar.** The TIME study's µEMA never re-prompted a missed question (Ponnada et al., 2022). Workers in a recent watch study found repeating the same kind of answer more burdensome than how often they were asked (Le et al., 2025). The fēnix's own wake-up dialog can already be declined, which dismisses it (Garmin Connect IQ, Background module).
5. **Use four fully labelled work words, in a fixed low-to-high order: Light, Steady, Busy, Hard.** A watch screen realistically holds fewer than five options (Le et al., 2025), and µEMA designers keep the answers on one screen without scrolling (Ponnada et al., 2022). Scales of two to four points measure less well than longer ones (Preston & Colman, 2000), so four is the most a round screen can hold, not an ideal. Labelling every point with words raises reliability and lowers effort (Krosnick & Presser, 2010). "Light" and "Hard" are anchor words on Borg's exertion scale, which was built to understand people at work (Borg, 1982).
6. **Keep the words about the work, not the body or mood.** NASA-TLX treats frustration (a feeling) as separate from demand and effort (Hart, 2006). A single "how stressful is your job" item pulls in respondents' own wellbeing as well as job demands (Houdmont et al., 2019). Offshift already has body words (Fine, Tired, Wiped), so the shift rating should not repeat or blur them. A single workload item is a defensible measure on its own (Gilbert & Kelloway, 2014; Wanous, Reichers & Hudy, 1997).
7. **Colour the blocks with a light-to-dark sequential ramp in one hue family, darker meaning harder, and avoid red, amber and green.** People read darker colours as "more", and on light backgrounds this works with, not against, the encoding (Schloss et al., 2019, as reported by Sibrel et al., 2020). Lightness should rise evenly and red and green should never sit at similar lightness (Crameri, Shephard & Heron, 2020). Recommended ramp, a violet "dusk" ramp: Light `#E5D8F0`, Steady `#C3ABD2`, Busy `#A382B3`, Hard `#805C8C`. It stays separable for protan, deutan and tritan simulations (Machado, Oliveira & Fernandes, 2009) and avoids the app's existing `warn` amber and `bad` coral.
8. **Never rely on colour alone.** WCAG 1.4.1 forbids colour as the only means of conveying information (W3C, 2023). Put the word on the block, add a 1 to 4 tick glyph, and give every block an ink outline. My CVD simulation shows that no single hue family stays clear of all three existing block colours (classes, plans, workplace), so the difficulty colours should appear in a "How shifts went" view that fades classes and plans to outlines.
9. **Design for reflection over weeks, not judgement of one night.** Long-term reflection reveals trends and patterns, and lack of context is a named barrier to reflection (Li, Dey & Forlizzi, 2010). The calendar view is the classic way to see weekday and holiday patterns at a glance (van Wijk & van Selow, 1999). Pair each rating with its context (weekday, start and end time, workplace, close or open) so patterns like "Friday closes are always Hard" can surface without Offshift claiming a cause.
10. **Keep the rating on the worker's side.** Workplace tracking raises surveillance concerns and "will not be for everyone" (Chung et al., 2017). Step counts at work become "a socially negotiated quantity" (Gorm & Shklovski, 2016). Worker-held data can help people plan, check their suspicions and argue their case (Zhang et al., 2022; Zhang et al., 2023). Difficulty ratings must never reach `/api/team`, and any sharing should be a summary the worker writes or chooses, never the raw log.

---

## 1. Watch prompt design

### 1.1 What the evidence on smartwatch self-report says

**Microinteraction EMA (µEMA).** Intille and colleagues proposed µEMA: every question is answered "with a quick glance and a tap", about as fast as checking the time. In a 4-week between-subjects pilot, µEMA on a watch (n=19) beat phone EMA (n=14) on compliance, completion and first-prompt response, and was rated less distracting, despite about 8 times as many interruptions (Intille et al., 2016).

Follow-up work gives concrete numbers:

| Study | Answer options | Response time | Compliance / completion | Missed prompts and undo |
|---|---|---|---|---|
| Ponnada et al. 2021, 1 week, 72 prompts a day | 4 activity levels | 5.4 s mean | 74% / 87% | Prompt vanished after 2 min, logged missed; 10 s "Undo?" |
| Ponnada et al. 2022, TIME study, 12 months | 3: Yes, Sort of, No | 4.3 s pilot, 4.8 s main | 67.6% / 78.5% (n=81) | Visible 20 s, no re-prompt; 3 s undo used on 4.2% of answers |
| Le et al. 2025, 7 days, Pixel Watch 2 | 4 in a radial layout, plus "Same" and search | not reported here | 72.4% response, 63.1% compliance | Response fell about 1% a day |

Points that matter for Offshift:

- **Number of options.** Ponnada et al. (2022) say the answer set has to fit the watch face without scrolling, because scrolling and small fonts slow answers, and participants valued having a middle option. Le et al. (2025) say a smartwatch realistically supports fewer than five choices. They used a radial layout because the middle items of a horizontal list were hard to tap.
- **Burden.** In Le et al. (2025), 55% of participants said repeating the same kind of answer was a bigger burden than how often they were asked. They also reported the burden of interruptions during demanding tasks and in social settings, and of limited hand availability. Non-response was higher in the afternoon and evening, which is when most casual closes happen.
- **Questionnaire length beats frequency.** In a 14-day student study, 60-item questionnaires raised burden and lowered compliance and data quality compared with 30 items, while asking three, six or nine times a day did not (Eisele et al., 2022). One question per shift is at the very low end of burden.

### 1.2 When to ask

**Event-contingent sampling.** EMA can assess "particular events" in people's lives as well as sampling them at intervals (Shiffman, Stone & Hufford, 2008). The end of a rostered shift is that kind of event, and Offshift already knows when it is.

**Not on the minute.** In Mehrotra et al. (2016), 474 rated notifications from 20 users showed perceived disruption was highest when the person was in the middle of or finishing a task, and lowest when idle or starting a new one. Disruption was highest while working, then after work, then while travelling. A prompt at exactly the rostered end time lands while the worker is still closing, counting the till or handing over. That is the worst moment.

**But not too late.**
- Workload ratings are designed to be given "while they are performing a task or immediately afterwards" (Hart, 2006).
- Remembered ratings of an experience follow its peak intensity and its last few minutes, and longer experiences were not remembered as worse (Redelmeier & Kahneman, 1996). Evidence from medical procedures transfers to shifts only by analogy. The direction is still clear: the further from the shift, the more the answer becomes a memory of the worst moment.
- EMA exists to reduce recall bias (Intille et al., 2016; Shiffman et al., 2008).

**Recommendation (to test):** schedule the prompt for the rostered end plus about 15 minutes, and skip it if the worker is still in a Connect IQ activity or the shift was edited to finish later. If the shift is a close, the prompt arrives during the walk or ride home, which Mehrotra et al. found moderately disruptive. A test should compare end+5, end+15 and end+30. The 15 minute figure is my proposal, not a published value.

**How the fēnix can do this (Connect IQ facts):**
- `Background.registerForTemporalEvent` takes a `Moment` (one time) or a `Duration` (repeating). Events cannot be scheduled less than 5 minutes after the previous one, and only one temporal event may be registered at a time (Garmin, Background module docs).
- `Background.requestApplicationWake(message)` shows a confirmation dialog asking to launch the app, with a message of up to 255 bytes. If declined, the app does not open and the dialog is dismissed. It works for widget and device-app background tasks, not watch faces, and `Background.exit()` must be called afterwards (Garmin docs).
- Implication: Offshift's `OffshiftService.mc` already registers a repeating 5-minute event. Rather than registering a second event (only one is allowed), the existing 5-minute tick should check "did a rostered shift end 15 or more minutes ago, without a rating and without a prompt?" and, if so, call `requestApplicationWake("How was the shift?")` once. The 5-minute tick means the prompt can arrive up to 5 minutes late, which is fine.
- Garmin developer forum posts report that the wake dialog sometimes fails to appear on some devices. That is a forum report, not documentation (unverified). Test on the real fēnix 8, and make sure the calendar always offers the rating as a fallback.

### 1.3 Skip, snooze and nagging

- **One prompt per shift, no re-prompt.** The TIME study logged unanswered questions as missed after 20 seconds and never asked again (Ponnada et al., 2022). The fēnix wake dialog has a built-in decline. Treat a decline the same as a skip.
- **No snooze on the watch.** A snooze is a second interruption about the same shift. The calendar's edit form is the "later": an unrated shift shows as "Not rated" (outline only, no fill), and the worker can rate it there at any time.
- **"Skip" is a real option.** Put "Skip" as the last list item. Log it as "Skipped", never as a missing or low value, so the visual never treats a skip as an easy shift.
- **Undo, not confirm.** Offshift's rule is that data changes come with confirm, cancel or undo. µEMA used a short undo (10 s in Ponnada et al., 2021; 3 s in 2022) rather than a confirmation screen, and 4.2% of answers were undone (Ponnada et al., 2022). A confirmation would double the presses for a low-stakes, private rating. Recommend a "Saved: Busy" screen with Undo for about 5 seconds, then close.
- **A per-workplace or global switch to turn prompts off**, reachable from the watch menu and the calendar. Monotony and repeated labelling are the main burdens reported (Le et al., 2025), and lapsing from tracking is normal (Epstein et al., 2015).

### 1.4 Wording and layout on a round 1.4" screen

- The fēnix 8 47mm screen is 454 x 454 px, round, 1.4" AMOLED (retailer specs; Garmin's developer device page was not opened). Menu2's look is device-specific and its docs do not say how many items are visible (Garmin, Menu2 docs).
- **Title:** name the shift so the rating is about this shift, not the job in general. Houdmont et al. (2019) found most people answering a global job item thought about their work in general, not a specific period. Suggested Menu2 title: `Café, 5-10pm`. Suggested question line: `How was the work?` (or `How was the shift?`).
- **Options, top to bottom:** Light, Steady, Busy, Hard, Skip. Keep the order fixed so muscle memory builds.
- **Initial focus:** Menu2 lets the app set the focused item. Focusing a middle item saves button presses but may anchor answers. No source tested this on watches. Start with focus on "Light" (the first item), and treat this as an open question.
- **No numbers on the watch.** Verbal labels spare respondents the step of turning numbers into meanings (Krosnick & Presser, 2010).
- **Avoid yes/no and agree/disagree forms** ("Was the shift hard? Yes / No"). Asking about the dimension directly is more reliable and less burdensome (Krosnick & Presser, 2010).

---

## 2. The difficulty scale

### 2.1 Is one item enough?

- A meta-analysis of single-item overall job satisfaction found an average correlation of .63 with multi-item scales (.67 corrected, up to .72 against the best scales), and a minimum reliability of .45 to .69 (Wanous, Reichers & Hudy, 1997).
- In 3,166 hospital employees, six of eleven single-item job stressor measures met all five validity criteria, and **workload** was one of the six (Gilbert & Kelloway, 2014).
- NASA-TLX is multi-dimensional (Hart, 2006), but Offshift is not measuring workload for science. It is giving the worker a mark on their own calendar. For that purpose one item, repeated over many shifts, is enough. Patterns come from many ratings, not from the precision of any one.

### 2.2 How many points

| Evidence | Pushes toward |
|---|---|
| 2, 3 and 4 point scales performed relatively poorly on reliability, validity and discrimination; quality rose up to about 7 points (Preston & Colman, 2000) | More points |
| Reliability is lower for 2 or 3 points and levels off after about 7 (Krosnick & Presser, 2010) | More points |
| A watch realistically holds fewer than 5 options (Le et al., 2025); the answer set should fit without scrolling (Ponnada et al., 2022) | Fewer points |
| The existing body rating already has 3 words (Fine, Tired, Wiped) | A different count avoids confusion |

**Recommendation: 4 points.** It is the most the watch can carry comfortably, and one more than the 3-point µEMA scale. It differs in count from the body scale, which helps keep the two apart. With 4 points there is no neutral middle. That suits a unipolar "how much" question, where "Steady" is the ordinary shift. A 5-point version (adding "Very hard" or "Flat out") is worth testing if workers say "Hard" covers too much.

### 2.3 Labels and wording

**Recommended label set: Light, Steady, Busy, Hard.**

| Label | Intended meaning | Why this word |
|---|---|---|
| Light | Less than a normal shift asked of you | Borg anchor ("light"); common workplace phrase ("light shift", "light duties") |
| Steady | A normal shift, manageable pace | Plain work word, neutral, no praise or blame |
| Busy | Fast pace, a lot to do | The everyday word for volume and time pressure in retail and hospitality; matches the QWI items about working "very fast" and having "a great deal to be done" (secondary) |
| Hard | Asked a lot of you: pace, effort or difficult moments | Borg anchor ("hard"); matches the QWI "work very hard" item (secondary) |

Sources behind the words:
- Borg's 6 to 20 scale uses "light" (11), "somewhat hard" (13), "hard" (15) and "very hard" (17) (Wikipedia's table, citing CDC and BorgPerception; secondary). Borg introduced the scales "to better understand man at work" (Borg, 1982). The words describe the work being done, which is why they suit a work-context rating. Borg's own guidance warns against changing his scales' wording (Lopes, Pereira & Silva, 2022). Offshift is not using the Borg scale, only borrowing two plain words, so it should not claim Borg validity.
- The Quantitative Workload Inventory measures the amount of work, which Spector's page says is "distinct from qualitative workload", that is, how difficult the work is (Spector & Jex, 1998; Spector's QWI page).
- NASA-TLX separates mental, physical and temporal demand, own performance, effort and frustration (Hart, 2006; subscale wording from the Wikipedia summary, secondary).

**A caution about "Busy" and "Hard".** By the QWI and NASA-TLX distinctions, "Busy" leans to amount and pace (temporal demand) and "Hard" leans to effort and difficulty. A shift can be busy but easy, or quiet but hard (an angry customer, a new task). The scale only works as an ordered scale if workers read the four words as "more and more demanding". Test this directly (section 6). Two fallbacks keep a single dimension:
- Pace only: **Quiet, Steady, Busy, Flat out.** "Quiet" and "flat out" are everyday Australian hospitality words. Note: "flat out" is my suggestion and was not found in any source.
- Demand only: **Easy, OK, Tough, Very tough.**

**Words to avoid:**
- **Body words** (tired, exhausted, sore, wiped). These belong to the body check and drift toward health. Offshift does not diagnose.
- **Mood or stress words** (stressful, awful, great, good, bad). A global stress item mixes job demands with the person's own wellbeing (Houdmont et al., 2019), and NASA-TLX puts frustration in its own subscale. Good and bad also judge the shift or the worker.
- **Performance words** (did well, struggled). These rate the worker, not the work, and could read as self-blame.

**Question wording:** `How was the work?` under a title naming the shift (`Café, 5-10pm`). Keep the question about the work so the answer is about the shift's demands.

**Relation to the existing body rating.** Keep the two separate: Fine, Tired, Wiped describes the worker's body, and Light, Steady, Busy, Hard describes the shift's demands. Do not merge them into one value. Do not infer one from the other.

---

## 3. Why shift difficulty matters for casual student workers

- **Most students work, and it costs study time.** In the 2017 Universities Australia survey, 82% of domestic undergraduates were in paid work. Full-time undergraduates worked a median of 12 hours a week. One in two financially independent students said work hurt their university performance, and one in three regularly missed classes to work (Universities Australia, 2018).
- **Work demands spill into study.** In 185 working university students, time demands and fewer psychological rewards at work were linked to more work-study conflict, and conflict was linked to more negative feelings about university (Creed, French & Hood, 2015; abstract via repository listing).
- **Unstable schedules harm wellbeing.** Among US hourly service workers, unstable and unpredictable schedules were linked to psychological distress, poor sleep and unhappiness, more strongly than low wages were, mostly through work-life conflict (Schneider & Harknett, 2019).
- **Recovery is hardest when it is needed most.** Recovery experiences such as psychological detachment, relaxation, mastery and control can be measured separately (Sonnentag & Fritz, 2007). Recovery activities and experiences suffer when job stressors are high (Sonnentag, Venz & Casper, 2017). Sonnentag (2018) calls this the "recovery paradox".
- **Late shifts and quick returns.** Disturbed sleep is the most common health-related effect of shift work, including afternoon shifts (Åkerstedt, 2003). Quick returns (11 hours or less between shifts, for example a late close then an early open) are linked to worse sleep, sleepiness and fatigue in the short term (Vedaa et al., 2016).
- **Worker-held data helps people plan and argue their case.** Gig drivers given their own data used it to recall trips, test whether extra effort paid off, compare planned with actual days off, plan schedules that earned less but were healthier, and confirm suspicions ("this isn't my imagination") (Zhang et al., 2023). Workers designing their own tools asked for "worker-centered data-driven insights for well-being" (Zhang et al., 2022).

**What this means for Offshift.** A record of which shifts were hard, kept by the worker, links directly to the moment Offshift exists for: a manager's ask. When "Can you cover Friday close?" arrives, the Week check could say, for example, "Your last 3 Friday closes: Hard, Hard, Busy" as a plain fact, with no advice and no decision. This is the "worker-centered insight" Zhang et al. describe, without telling the worker what to do. No study tested this exact use, so it is a design hypothesis.

---

## 4. Colour encoding on the calendar

### 4.1 Principles from the literature

- **Ordered data needs a sequential scheme.** ColorBrewer picks schemes by number of classes, the nature of the data and the end-use environment (Harrower & Brewer, 2003; abstract summary).
- **Lightness should change evenly and in one direction.** "Both lightness and brightness should increase linearly". A monotonic lightness gradient stays readable in greyscale (Crameri, Shephard & Heron, 2020).
- **No rainbow, no red-green.** A map should not contain "red and green at a similar luminosity". About 8% of men and 0.5% of women have a colour-vision deficiency (Crameri et al., 2020). Cividis shows that colour maps can be made to read almost the same for people with and without red-green colour blindness (Nuñez, Anderton & Renslow, 2018).
- **Darker should mean more.** People read darker colours as larger quantities unless a colormap seems to vary in opacity. On light backgrounds, the dark-is-more and opaque-is-more biases point the same way (Schloss et al., 2019, reported in Sibrel et al., 2020; the Schloss lab page states the same). Offshift has a cream ground, so "darker = harder" matches what people already expect.
- **Avoid judgmental and alarm colours.** Red, amber and green carry traffic-light meaning. Offshift's own tokens already use amber for `warn` (#A67A25) and coral-red for `bad` (#B95E47), and the workplace block is forest green (#374938). A difficulty colour borrowed from any of these would say "warning", "bad" or "your workplace", not "this shift asked more of you". This argument is a design inference from the palette, not a cited finding.

### 4.2 Recommended ramp: violet "dusk", 4 steps

Ground `#F5F2ED` (cream), ink `#374938` and `#1D2A25` (forest green), from `offshift-phone/src/app/globals.css`.

| Step | Hex | CIE L* | Contrast vs cream ground | Label text colour | Label contrast |
|---|---|---|---|---|---|
| Light | `#E5D8F0` | 88.0 | 1.22 | ink-strong `#1D2A25` | 10.9 : 1 |
| Steady | `#C3ABD2` | 73.1 | 1.87 | ink-strong `#1D2A25` | 7.2 : 1 |
| Busy | `#A382B3` | 59.0 | 2.94 | ink-strong `#1D2A25` | 4.5 : 1 (just passes AA) |
| Hard | `#805C8C` | 44.4 | 4.91 | cream `#F5F2ED` | 4.9 : 1 |
| Not rated | no fill, ink outline | | | | |

Adjacent-step colour difference (CIEDE2000), including simulated colour-vision deficiency at full severity:

| Vision | Light to Steady | Steady to Busy | Busy to Hard |
|---|---|---|---|
| Typical | 11.8 | 12.0 | 14.5 |
| Protan | 11.3 | 12.1 | 14.7 |
| Deutan | 10.8 | 11.5 | 14.2 |
| Tritan | 11.0 | 11.9 | 14.5 |

Every adjacent pair stays above about 10 ΔE00 for every simulation. Lightness falls evenly (about 15 L* per step), so the ramp also reads in greyscale (relative luminance .72, .45, .27, .14).

**How these numbers were made.** I wrote a Python script (`docs/research/2026-10-23-difficulty-ramp-check.py`) that builds the colours in OKLCH, converts them to sRGB, and computes WCAG contrast, CIE L*, CIEDE2000 and colour-blind simulations using the Machado, Oliveira & Fernandes (2009) severity-1.0 matrices (taken from the authors' page) applied in linear RGB. The colours are my own design, modelled on single-hue sequential schemes like ColorBrewer's Purples. They are **not** an official ColorBrewer palette.

**Why violet rather than an earth (sand to umber) ramp.** I also tested a sand-to-umber ramp (`#EEE2C5`, `#D5B993`, `#B78D69`, `#8D6046`). It reads well and fits the cream and green palette. But under protan and deutan simulation its middle steps fall within 4 to 7 ΔE00 of the coral plan blocks (`#E59981`), and its tan middle is close to the app's amber `warn`. Violet is used nowhere else in Offshift, has no traffic-light meaning, and keeps away from coral. Its weakness: under protan and deutan simulation the Light step is close to the powder-blue class blocks (`#C8D5E1`, ΔE00 about 4). That is why 4.3 recommends a dedicated view.

**Optional 5-step version** (if testing shows workers want "Very hard"): `#E8DEF3`, `#CBB8DA`, `#AF94BF`, `#9471A1`, `#724E7D`. Adjacent ΔE00 stays at 9 or more under all simulations, but step 4 gives only 3.7:1 for label text in either ink or cream. Put that label outside the block or use a darker step 4.

**Caveat for 3D.** Three.js lighting and shading change the rendered colour of each face. The values above apply to a flat face under neutral light. Use an unlit or lightly lit top face for the difficulty colour, and re-check the rendered pixels with a colour picker.

### 4.3 Redundant encoding and where the colour lives

1. **A "How shifts went" view.** No single hue family I tested stays clear of all three existing block colours under every colour-blind simulation. Show the ramp in a dedicated view (a toggle or lens) where classes and plans fade to outlines and only shifts are filled. In the normal week view, keep the workplace colour and show the difficulty as a small chip with the word.
2. **The word on the block.** "Hard" printed on the top face, in the label colours above. This satisfies WCAG 1.4.1, which says colour must not be "the only visual means of conveying information" and suggests text or shape as the extra cue (W3C, 2023).
3. **A tick glyph.** 1 to 4 short bars (like a signal meter) beside the word, so order shows without colour or reading.
4. **An ink outline on every block** (`#374938`, 8.7:1 against cream). The Light step is only 1.22:1 against the ground, so the outline is what separates the block from the page. WCAG 1.4.11 asks 3:1 for meaningful graphics against adjacent colours (W3C, 2023).
5. **Keep height for duration.** Block size already encodes time. Do not reuse height or depth for difficulty.
6. **A legend that is always visible in the view**, with the four words in order and "Not rated".

### 4.4 Calendar patterns

The calendar view was introduced to show daily patterns on a calendar, so weekly rhythms, weekends, holidays and exceptional days can be seen "almost effortlessly" (van Wijk & van Selow, 1999). For Offshift this suggests:
- In addition to the dated week, offer a **past-weeks strip** (for example the last 6 to 8 weeks as rows of small blocks) so "every Friday close is dark" becomes visible.
- Allow **grouping by context** (workplace, weekday, open or close), in the spirit of van Wijk and van Selow's cluster-then-calendar idea, but without automatic clustering or labels that claim a cause.

---

## 5. Reflection and risks

### 5.1 How ratings with context support reflection

- **Stage-based model.** Personal informatics moves through preparation, collection, integration, reflection and action, and barriers in one stage cascade into later ones (Li, Dey & Forlizzi, 2010). For Offshift:
  - *Collection:* the one-press watch prompt lowers collection burden.
  - *Integration:* rating straight onto the shift that is already on the calendar removes integration work. Li et al. found manual transfer between tools wasted data.
  - *Reflection:* Li et al. separate short-term reflection (awareness right after recording, here the block changing colour) from long-term reflection (comparing across weeks to find trends). Reflection barriers they found include lack of time, "No context" and "Sparse data".
  - *Action:* belongs to the worker. Offshift only shows patterns when an ask arrives.
- **Multiple facets.** Li et al. found people wanted to see links between facets of their lives. Shift difficulty next to classes and body checks on the same week is exactly this, as long as Offshift does not draw conclusions for the worker.
- **Levels of reflection.** Fleck and Fitzpatrick (2010) describe levels from R0 description through R1 reflective description, R2 dialogic reflection, R3 transformative reflection and R4 critical reflection (secondary, via Lee et al., 2023). They suggest recording supports R0, question-asking R1 and exploring other perspectives R2 (secondary). A personal informatics review found that prompts focusing on "why" could encourage transformative reflection (Cho et al., 2022, secondary via Lee et al., 2023). For Offshift: the colour itself is R0. An optional note ("what made it Hard?") supports R1. Grouping by context ("Friday closes vs weekday lunches") supports R2. Whether the worker then changes what they accept is R3, and that is theirs to decide.
- **Reflection is rarely defined or measured directly** in systems that claim to support it (Baumer et al., 2014). Baumer (2015) frames reflection around breakdown, inquiry and transformation (abstract summary). Evaluations should ask workers what they noticed and did, not just count ratings.
- **Lapsing is normal.** The lived informatics model includes lapsing and resuming tracking (Epstein et al., 2015). Gaps should look neutral ("Not rated"), not like failure.

### 5.2 Risks and mitigations

| Risk | Evidence | Mitigation |
|---|---|---|
| **Rating fatigue** | Repeated labelling is a bigger burden than frequency (Le et al., 2025); response fell about 1% a day; longer questionnaires raise burden (Eisele et al., 2022) | One item, one prompt per shift, Skip always there, prompts can be switched off per workplace, no streaks or reminders |
| **Negativity and peak-end bias** | Bad events weigh more and are processed more thoroughly than good ones (Baumeister et al., 2001); retrospective ratings track the worst and final moments (Redelmeier & Kahneman, 1996) | Ask soon after the shift; label the view "how shifts went" rather than "bad shifts"; show counts of all four levels, not only Hard; never total a "score" |
| **Judgemental colour** | Traffic-light and red-green maps carry meaning and exclude CVD readers (Crameri et al., 2020) | Violet ramp; no red, amber or green; words and ticks as well as colour |
| **Data used against the worker** | Employers' tracking has expanded on and off the job, and legal protections lag (Ajunwa, Crawford & Schultz, 2017; abstract via search); workplace tracking raises surveillance worries (Chung et al., 2017) | Difficulty ratings never reach `/api/team`, are excluded from any team projection (add to the existing privacy-boundary tests), and are stored like body readings |
| **Social pressure at work** | In a workplace step campaign, steps became "a socially negotiated quantity" and affected people who opted out too (Gorm & Shklovski, 2016) | No team or peer comparison; no "share with manager" button for raw ratings; if a worker wants to share, they share a sentence they write, from the calendar, deliberately |
| **Offshift deciding for the worker** | Worker tools should be "assistive, not prescriptive" and respect hard constraints such as money and caregiving (Zhang et al., 2023) | The Week check shows facts ("last 3 Friday closes: Hard, Hard, Busy"), never "you should decline" |
| **Health creep** | Global stress items pull in wellbeing (Houdmont et al., 2019) | Work words only; no inference from difficulty to body or mood; no advice |
| **Missing data read as easy shifts** | Sparse data is a reflection barrier (Li et al., 2010) | Skipped and unrated shifts get their own look (outline only), never the Light colour |

---

## 6. Open questions to test with workers

1. **Do the four words form one ladder?** Card-sort test: give P1 to P5 the words Light, Steady, Busy, Hard (plus Quiet and Flat out) and ask them to order them and describe a shift for each. Watch for "Busy" and "Hard" being treated as different kinds of shift rather than steps.
2. **Is four enough?** After two weeks, ask whether any shift did not fit. If "Hard" covers both "hard" and "awful", try adding a fifth step.
3. **When should the watch ask?** Compare end+5, end+15 and end+30 minutes (or let each worker choose). Measure response rate, declines and what the worker was doing.
4. **Initial focus.** Does focusing "Steady" (fewer presses) shift answers toward Steady compared with focusing "Light"?
5. **Undo or confirm?** Does a 5 second "Saved: Busy, Undo" feel safe enough, or do workers want a confirm screen like Accept and Decline?
6. **Does the colour read right?** Show the violet ramp and the earth ramp. Ask which shift was hardest without the legend (tests dark-is-more), and include at least one colour-blind participant or a simulator check of the rendered 3D view.
7. **Does it help with a real ask?** When a test offer arrives, does seeing past ratings for the same kind of shift change how the worker thinks about it? Does it feel like information or pressure?
8. **Who should see it?** Would workers ever want to share a summary with a manager, and in what form? Confirm nobody expects the raw ratings to be visible to the employer.
9. **Does the body rating still make sense next to this one?** Check whether workers feel they are rating the same thing twice.

---

## References

Each entry ends with how far I checked it.

1. Ajunwa, I., Crawford, K., & Schultz, J. M. (2017). Limitless worker surveillance. *California Law Review*, 105(3), 735. SSRN: https://papers.ssrn.com/abstract=2746211. *Checked: abstract via search summaries; full text not opened.*
2. Åkerstedt, T. (2003). Shift work and disturbed sleep/wakefulness. *Occupational Medicine*, 53(2), 89-94. https://doi.org/10.1093/occmed/kqg046. *Checked: abstract (Europe PMC).*
3. Baumeister, R. F., Bratslavsky, E., Finkenauer, C., & Vohs, K. D. (2001). Bad is stronger than good. *Review of General Psychology*, 5(4), 323-370. https://doi.org/10.1037/1089-2680.5.4.323. *Checked: metadata (Crossref) and abstract via search summary.*
4. Baumer, E. P. S. (2015). Reflective informatics: Conceptual dimensions for designing technologies of reflection. *Proc. CHI 2015*, 585-594. https://doi.org/10.1145/2702123.2702234. *Checked: metadata (Crossref) and Semantic Scholar summary.*
5. Baumer, E. P. S., Khovanskaya, V., Matthews, M., Reynolds, L., Schwanda Sosik, V., & Gay, G. (2014). Reviewing reflection: On the use of reflection in interactive system design. *Proc. DIS 2014*, 93-102. https://doi.org/10.1145/2598510.2598598. *Checked: metadata (Crossref) and Semantic Scholar summary.*
6. Borg, G. A. (1982). Psychophysical bases of perceived exertion. *Medicine & Science in Sports & Exercise*, 14(5), 377-381. https://doi.org/10.1249/00005768-198205000-00012. *Checked: abstract (Europe PMC). Verbal anchors via Wikipedia's "Rating of perceived exertion" table (secondary).*
7. Chung, C.-F., Gorm, N., Shklovski, I. A., & Munson, S. (2017). Finding the right fit: Understanding health tracking in workplace wellness programs. *Proc. CHI 2017*, 4875-4886. https://doi.org/10.1145/3025453.3025510. *Checked: abstract (ITU research portal).*
8. Cho, J., Xu, T., Zimmermann-Niefield, A., & Voida, S. (2022). Reflection in theory and reflection in practice: An exploration of the gaps in reflection support among personal informatics apps. *Proc. CHI 2022*, 1-23. https://doi.org/10.1145/3491102.3501991. *Checked: metadata (Crossref); finding via Lee et al. 2023 (secondary).*
9. Crameri, F., Shephard, G. E., & Heron, P. J. (2020). The misuse of colour in science communication. *Nature Communications*, 11, 5444. https://doi.org/10.1038/s41467-020-19160-7. *Checked: full text (PMC7595127).*
10. Creed, P. A., French, J., & Hood, M. (2015). Working while studying at university: The relationship between work benefits and demands and engagement and well-being. *Journal of Vocational Behavior*, 86, 48-57. https://doi.org/10.1016/j.jvb.2014.11.002. *Checked: metadata (Crossref); abstract via Griffith repository listing in search results (repository page itself returned 403).*
11. Eisele, G., Vachon, H., Lafit, G., Kuppens, P., Houben, M., Myin-Germeys, I., & Viechtbauer, W. (2022). The effects of sampling frequency and questionnaire length on perceived burden, compliance, and careless responding in experience sampling data in a student population. *Assessment*, 29(2), 136-151. https://doi.org/10.1177/1073191120957102. *Checked: abstract (Maastricht University repository).*
12. Epstein, D. A., Ping, A., Fogarty, J., & Munson, S. A. (2015). A lived informatics model of personal informatics. *Proc. UbiComp 2015*, 731-742. https://doi.org/10.1145/2750858.2804250. *Checked: metadata (Crossref), Semantic Scholar summary and search summary of the abstract.*
13. Fleck, R., & Fitzpatrick, G. (2010). Reflecting on reflection: Framing a design landscape. *Proc. OZCHI 2010*, 216-223. https://doi.org/10.1145/1952222.1952269. *Checked: metadata (Crossref); levels via Lee et al. 2023 (secondary). The TU Wien PDF could not be reached.*
14. Garmin. Connect IQ API documentation: Toybox.Background module. https://developer.garmin.com/connect-iq/api-docs/Toybox/Background.html. *Checked: page read (accessed 23 Oct 2026).*
15. Garmin. Connect IQ API documentation: Toybox.WatchUi.Menu2. https://developer.garmin.com/connect-iq/api-docs/Toybox/WatchUi/Menu2.html. *Checked: page read (accessed 23 Oct 2026).*
16. Gilbert, S., & Kelloway, E. K. (2014). Using single items to measure job stressors. *International Journal of Workplace Health Management*, 7(3), 186-199. https://doi.org/10.1108/IJWHM-03-2013-0011. *Checked: abstract (Crossref).*
17. Gorm, N., & Shklovski, I. (2016). Steps, choices and moral accounting: Observations from a step-counting campaign in the workplace. *Proc. CSCW 2016*, 148-159. https://doi.org/10.1145/2818048.2819944. *Checked: abstract (ITU research portal).*
18. Harrower, M., & Brewer, C. A. (2003). ColorBrewer.org: An online tool for selecting colour schemes for maps. *The Cartographic Journal*, 40(1), 27-37. https://doi.org/10.1179/000870403235002042. *Checked: metadata (Crossref) and Semantic Scholar summary.*
19. Hart, S. G. (2006). NASA-Task Load Index (NASA-TLX); 20 years later. *Proceedings of the Human Factors and Ergonomics Society Annual Meeting*, 50(9), 904-908. https://doi.org/10.1177/154193120605000909. *Checked: abstract (Crossref). Subscale names via Wikipedia's NASA-TLX article (secondary). NASA's PDF host refused the connection.*
20. Houdmont, J., Jachens, L., Randall, R., Hopson, S., Nuttall, S., & Pamia, S. (2019). What does a single-item measure of job stressfulness assess? *International Journal of Environmental Research and Public Health*, 16(9), 1480. https://doi.org/10.3390/ijerph16091480. *Checked: abstract (Europe PMC).*
21. Intille, S., Haynes, C., Maniar, D., Ponnada, A., & Manjourides, J. (2016). µEMA: Microinteraction-based ecological momentary assessment (EMA) using a smartwatch. *Proc. UbiComp 2016*, 1124-1128. https://doi.org/10.1145/2971648.2971717. *Checked: abstract (Semantic Scholar) and metadata (Crossref).*
22. Krosnick, J. A., & Presser, S. (2010). Question and questionnaire design. In P. V. Marsden & J. D. Wright (Eds.), *Handbook of Survey Research* (2nd ed., pp. 263-313). Emerald. PDF: https://web.stanford.edu/dept/communication/faculty/krosnick/docs/2010/2010%20Handbook%20of%20Survey%20Research.pdf. *Checked: full text (sections 9.3 to 9.4). Page range from memory, not verified.*
23. Le, H., Potter, V., Lakshminarayanan, R., Mishra, V., & Intille, S. (2025). Feasibility and utility of multimodal micro ecological momentary assessment on a smartwatch. *Proc. CHI 2025*. https://doi.org/10.1145/3706598.3714086. *Checked: full text (PMC12718675), first half.*
24. Lee, K. J., Davila, A., Cheng, H., Goh, J., Nilsen, E., & Law, E. (2023). "We need to do more ... I need to do more": Augmenting digital media consumption via critical reflection to increase compassion and promote prosocial attitudes and behaviors. arXiv:2305.04377. https://arxiv.org/abs/2305.04377. *Checked: full text (used only as a secondary source for Fleck & Fitzpatrick and Cho et al.).*
25. Li, I., Dey, A., & Forlizzi, J. (2010). A stage-based model of personal informatics systems. *Proc. CHI 2010*, 557-566. https://doi.org/10.1145/1753326.1753409. *Checked: full text.*
26. Lopes, T. R., Pereira, H. M., & Silva, B. M. (2022). Perceived exertion: Revisiting the history and updating the neurophysiology and the practical applications. *International Journal of Environmental Research and Public Health*, 19(21), 14439. https://doi.org/10.3390/ijerph192114439. *Checked: full text (PMC9658641), first part.*
27. Machado, G. M., Oliveira, M. M., & Fernandes, L. A. F. (2009). A physiologically-based model for simulation of color vision deficiency. *IEEE Transactions on Visualization and Computer Graphics*, 15(6), 1291-1298. https://doi.org/10.1109/TVCG.2009.113. Matrices: https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html. *Checked: authors' matrix page read; paper metadata via Semantic Scholar.*
28. Mehrotra, A., Pejovic, V., Vermeulen, J., Hendley, R., & Musolesi, M. (2016). My phone and me: Understanding people's receptivity to mobile notifications. *Proc. CHI 2016*, 1021-1032. https://doi.org/10.1145/2858036.2858566. *Checked: full text (UCL Discovery PDF).*
29. Nuñez, J. R., Anderton, C. R., & Renslow, R. S. (2018). Optimizing colormaps with consideration for color vision deficiency to enable accurate interpretation of scientific data. *PLOS ONE*, 13(7), e0199239. https://doi.org/10.1371/journal.pone.0199239. *Checked: abstract (Europe PMC).*
30. Ponnada, A., Thapa-Chhetry, B., Manjourides, J., & Intille, S. (2021). Measuring criterion validity of microinteraction ecological momentary assessment (micro-EMA): Exploratory pilot study with physical activity measurement. *JMIR mHealth and uHealth*, 9(3), e23391. https://doi.org/10.2196/23391. *Checked: full text (PMC7991987). Title confirmed via Crossref.*
31. Ponnada, A., Wang, S., Chu, D., Do, B., Dunton, G., & Intille, S. (2022). Intensive longitudinal data collection using microinteraction ecological momentary assessment: Pilot and preliminary results. *JMIR Formative Research*, 6(2), e32772. https://doi.org/10.2196/32772. *Checked: full text (PMC8867293), first 70%.*
32. Preston, C. C., & Colman, A. M. (2000). Optimal number of response categories in rating scales: Reliability, validity, discriminating power, and respondent preferences. *Acta Psychologica*, 104(1), 1-15. https://doi.org/10.1016/S0001-6918(99)00050-5. *Checked: abstract (Europe PMC).*
33. Redelmeier, D. A., & Kahneman, D. (1996). Patients' memories of painful medical treatments: Real-time and retrospective evaluations of two minimally invasive procedures. *Pain*, 66(1), 3-8. https://doi.org/10.1016/0304-3959(96)02994-6. *Checked: abstract (Europe PMC).*
34. Schloss, K. B., Gramazio, C. C., Silverman, A. T., Parker, M. L., & Wang, A. S. (2019). Mapping color to meaning in colormap data visualizations. *IEEE Transactions on Visualization and Computer Graphics*, 25(1), 810-819. https://doi.org/10.1109/TVCG.2018.2865147. *Checked: metadata (Crossref), lab summary page, and findings as described in Sibrel et al. 2020 (secondary).*
35. Schneider, D., & Harknett, K. (2019). Consequences of routine work-schedule instability for worker health and well-being. *American Sociological Review*, 84(1), 82-114. https://doi.org/10.1177/0003122418823184. *Checked: abstract (Crossref).*
36. Shiffman, S., Stone, A. A., & Hufford, M. R. (2008). Ecological momentary assessment. *Annual Review of Clinical Psychology*, 4, 1-32. https://doi.org/10.1146/annurev.clinpsy.3.022806.091415. *Checked: metadata (Crossref) and abstract via search summary.*
37. Sibrel, S. C., Rathore, R., Lessard, L., & Schloss, K. B. (2020). The relation between color and spatial structure for interpreting colormap data visualizations. *Journal of Vision*, 20(12), 7. https://doi.org/10.1167/jov.20.12.7. *Checked: full text (NSF PAR PDF).*
38. Sonnentag, S. (2018). The recovery paradox: Portraying the complex interplay between job stressors, lack of recovery, and poor well-being. *Research in Organizational Behavior*, 38, 169-185. https://doi.org/10.1016/j.riob.2018.11.002. *Checked: abstract (Semantic Scholar).*
39. Sonnentag, S., & Fritz, C. (2007). The Recovery Experience Questionnaire: Development and validation of a measure for assessing recuperation and unwinding from work. *Journal of Occupational Health Psychology*, 12(3), 204-221. https://doi.org/10.1037/1076-8998.12.3.204. *Checked: abstract (Europe PMC). Pages confirmed via Crossref.*
40. Sonnentag, S., Venz, L., & Casper, A. (2017). Advances in recovery research: What have we learned? What should be done next? *Journal of Occupational Health Psychology*, 22(3), 365-380. https://doi.org/10.1037/ocp0000079. *Checked: abstract (Europe PMC); volume and pages via Crossref.*
41. Spector, P. E., & Jex, S. M. (1998). Development of four self-report measures of job stressors and strain: Interpersonal Conflict at Work Scale, Organizational Constraints Scale, Quantitative Workload Inventory, and Physical Symptoms Inventory. *Journal of Occupational Health Psychology*, 3(4), 356-367. https://doi.org/10.1037/1076-8998.3.4.356. Scale page: https://paulspector.com/assessments/pauls-no-cost-assessments/quantitative-workload-inventory-qwi/. *Checked: metadata (Crossref) and Spector's QWI page. Item wording via search summaries (secondary).*
42. Universities Australia. (2018). *2017 Universities Australia Student Finances Survey* (Report by S. Arkoudis, S. Marangell, C. Baik, C. Patrick, E. Bexley & R. James, Melbourne Centre for the Study of Higher Education). https://universitiesaustralia.edu.au/wp-content/uploads/2019/06/180713-2017-UA-Student-Finance-Survey-Report.pdf. *Checked: full text (grey literature, not peer reviewed).*
43. van Wijk, J. J., & van Selow, E. R. (1999). Cluster and calendar based visualization of time series data. *Proc. IEEE Symposium on Information Visualization (InfoVis '99)*, 4-9. https://doi.org/10.1109/INFVIS.1999.801851. *Checked: full text (author PDF).*
44. Vedaa, Ø., Harris, A., Bjorvatn, B., Waage, S., Sivertsen, B., Tucker, P., & Pallesen, S. (2016). Systematic review of the relationship between quick returns in rotating shift work and health-related outcomes. *Ergonomics*, 59(1), 1-14. https://doi.org/10.1080/00140139.2015.1052020. *Checked: abstract (Europe PMC); volume and pages via Crossref (online 2015, issue 2016).*
45. W3C. (2023). *Understanding WCAG 2.2: Success Criterion 1.4.1 Use of Color*. https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html. *Checked: page read.* Also *Understanding SC 1.4.11 Non-text Contrast*: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast. *Checked: via search summary.*
46. Wanous, J. P., Reichers, A. E., & Hudy, M. J. (1997). Overall job satisfaction: How good are single-item measures? *Journal of Applied Psychology*, 82(2), 247-252. https://doi.org/10.1037/0021-9010.82.2.247. *Checked: abstract (Europe PMC).*
47. Zhang, A., Boltz, A., Wang, C. W., & Lee, M. K. (2022). Algorithmic management reimagined for workers and by workers: Centering worker well-being in gig work. *Proc. CHI 2022*, 1-20. https://doi.org/10.1145/3491102.3501866. *Checked: abstract (Semantic Scholar).*
48. Zhang, A., Boltz, A., Lynn, J., Wang, C.-W., & Lee, M. K. (2023). Stakeholder-centered AI design: Co-designing worker tools with gig workers through data probes. *Proc. CHI 2023*, 1-19. https://doi.org/10.1145/3544548.3581354. *Checked: full text (ar5iv), first 90%.*

### Not verified or deliberately left out

- The "about 15 minutes after the rostered end" prompt delay, "Flat out" as a label, the tick glyph, and the "How shifts went" view are my design proposals, not findings.
- Garmin forum reports that `requestApplicationWake` sometimes fails on some devices are unverified community posts.
- fēnix 8 screen specs (454 x 454 px, 1.4") come from retailer listings, not Garmin's developer device reference.
- Huang et al. (2015) "Personal visualization and personal visual analytics" (*IEEE TVCG*, 21(3), 420-433, https://doi.org/10.1109/TVCG.2014.2359887) is relevant further reading on personal data visualization, but I only confirmed its metadata, so no claim in this brief rests on it.
- I did not open Weijters, Cabooter & Schillewaert (2010) beyond its abstract, which does not state its recommendations, so I did not cite it for any label advice.
