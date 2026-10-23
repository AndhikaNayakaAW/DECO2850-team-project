# Offshift: a weekly view of your own body data, for reflection

Research brief for DECO2850 (Design Computing Studio 2), team Tarzan. Prepared 23 October 2026.

**Scope.** This brief supports the design rationale for a weekly visualisation of a casual worker's own Garmin fēnix 8 data, shown alongside their shifts, classes and rest. It answers five questions: which signals the watch can really provide and how trustworthy they are; what the occupational and sleep research says about irregular shifts and students; what personal informatics and reflection theory recommend; how to visualise a week of body data; and what the risks are.

**How sources were handled.** Every source below was opened during this research (full text, author PDF, publisher or repository abstract, or the bibliographic record in OpenAlex). Where only an abstract or a secondary description was available, the text says so. Claims I could not check against the original are marked **(unverified)**. Nothing here is drawn from the Offshift interviews (P1 to P5), because no interview data was provided for this brief; Section 7 lists what to ask them.

---

## Summary: design implications

1. **Show recovery as a sequence across the week, not as single nights.** The strongest occupational evidence is about sequences: a late finish followed by an early start (a "quick return" or "clopening") shortens the next sleep, and the body often catches up the night after (Vedaa et al., 2016; Schneider & Harknett, 2019). A week view that lines up "shift end, overnight recharge, next commitment" makes that pattern visible in a way a daily score cannot.
2. **Keep the robust signals and drop the fragile ones.** Wrist wearables are reasonable for sleep timing and duration and for heart rate, but weak for sleep stages, HRV on Garmin, and pulse oximetry (Miller et al., 2022; Mouritzen et al., 2020; Chinoy et al., 2021; Dial et al., 2025; Carrier et al., 2025). Offshift's weekly view should centre on overnight Body Battery recharge, daily stress time, resting heart rate against the worker's own usual, and activity, and should leave out SpO2 and sleep stages.
3. **Put the body data on the calendar the worker already lives in.** A field study found that overlaying fitness data on a personal calendar helped people explain patterns and anomalies, and the number of "I can't tell why" moments fell from 29 to 8 over the study (Huang, Tory & Bartram, 2016). Missing context is a named barrier to reflection (Li, Dey & Forlizzi, 2010; Choe et al., 2014).
4. **Compare people with themselves, in ranges, with no verdicts.** Sleep experts and users both get misled by precise single scores; the recommendation is ranges and trends (Ravichandran et al., 2017). Garmin's own Health Status uses "within / outside your usual range" against a three-week personal baseline. Offshift's 0 to 3 levels already fit this; the week view should keep them and avoid "good/poor" language and red/green judgement colours (Consolvo et al., 2008).
5. **Let the worker annotate and say how it felt.** Self-tracked numbers often disagree with felt experience (Rosenbach et al., 2025; Ravichandran et al., 2017), and reflection needs triggers and context the sensor cannot capture (Choe et al., 2014). A one-tap "how did that shift feel" and free notes make the worker the interpreter, which also keeps the design on the right side of the "no diagnosis, no advice" rule.
6. **Design for reflection on purpose; it will not happen just because data is shown.** Reviews find reflection rarely happens automatically and must be invited, for example through temporal perspective, comparison, conversation and discovery (Baumer et al., 2014; Bentvelzen et al., 2022). Pose open questions ("What was different about Thursday?") rather than conclusions.
7. **Treat the employer boundary as a hard constraint backed by law and evidence.** In Australia, once health information becomes part of an employee record held by a private-sector employer, the Privacy Act's employee records exemption can apply (OAIC). Workplace tracking research documents surveillance worries and social pressure (Ajunwa, Crawford & Schultz, 2017; Chung et al., 2017; Gorm & Shklovski, 2016). The weekly view must be private by default and never feed anything to the manager except what the worker explicitly chooses to say.
8. **Use 3D for the shape of the week; put body data on the floor, not on the blocks.** Depth, occlusion and perspective distortion make 3D poor for comparing magnitudes (Munzner, VAD "No unjustified 3D"; Zacks et al., 1998), and 2D beats 3D for overview tasks (Kraus et al., 2020). On the calendar itself, a flat "floor rail" of luminance-shaded cells on each day tile, with overnight recharge as a bridge between tiles and hatching for "no reading", keeps height free for duration and hue free for shift difficulty; a top-down "read flat" camera preset turns it into a 2D calendar heatmap (Section 4b; Gleicher, 2018; van Wijk & van Selow, 1999; Song & Szafir, 2019).

---

## 1 Available Garmin signals

### 1.1 Two layers: what the watch measures, and what Offshift can read

The fēnix 8 computes many health metrics, but a Connect IQ app can only read some of them. From the Connect IQ API documentation:

- `Toybox.SensorHistory` gives histories for heart rate, SpO2 (`getOxygenSaturationHistory`, API 3.2.0), Body Battery and stress (`getBodyBatteryHistory`, `getStressHistory`, API 3.3.0). The sampling interval is "device dependent" (Garmin, Connect IQ SensorHistory docs).
- `Toybox.ActivityMonitor.Info` gives steps, `activeMinutesDay` and `activeMinutesWeek` (intensity minutes), `respirationRate` and `timeToRecovery` (API 3.3.0), and a 30-second rolling `stressScore` (API 5.0.0).
- `Toybox.UserProfile` gives `averageRestingHeartRate`, defined as a seven-day average from historical data (API 3.2.0), plus the user's configured typical sleep and wake times.
- `Toybox.Complications` lists a `COMPLICATION_TYPE_SLEEP_SCORE` (API 6.0.2) alongside Body Battery, stress, pulse ox, respiration, recovery time and training status. **(Unverified:** whether a device app, as opposed to a watch face, can read the sleep score complication on the fēnix 8.)
- I did not find HRV status, sleep stages, training readiness or skin temperature in the Connect IQ pages reviewed. They are visible in Garmin Connect and on the watch's own glances. Garmin's cloud Health API is a separate, partner-approved route.

This matters for the rationale: Offshift's choice to use overnight Body Battery recharge as a sleep proxy is a reasonable response to what the API exposes, not a shortcut.

### 1.2 Signal table

| Signal | What it is and how it is derived | Weekly usefulness | Validity caveats | Sources |
|---|---|---|---|---|
| **Body Battery** (0 to 100) | Garmin/Firstbeat composite. The watch "analyzes your heart rate variability, stress level, sleep quality, and activity data". Bands: 0 to 25 low, 26 to 50 medium, 51 to 75 high, 76 to 100 very high reserve. Good sleep charges it; strenuous activity and high stress drain it. Garmin says food and caffeine have no impact. | **High.** Its daily shape (overnight charge, daytime drain) maps directly onto shifts and rest. Best shown as daily rise and fall, not as a single number. | Proprietary composite; the formula is not published. I found **no peer-reviewed validation of Body Battery itself (unverified absence)**. Its inputs (HRV, sleep detection) carry their own errors (rows below). Garmin advises wearing it overnight for accuracy. | Garmin fēnix 7 Owner's Manual, "Body Battery"; Connect IQ SensorHistory docs |
| **Overnight recharge** (Offshift's sleep proxy) | Derived by Offshift: Body Battery gained during the sleep window. | **High** as a "did I recover" indicator across a week. | A derived value of a proprietary composite; never validated as a sleep measure. Should be labelled "overnight recharge", not "sleep quality". | As above |
| **Sleep** (duration, timing, stages, score) | Watch detects sleep automatically, using movement during the configured sleep window and heart signals; records total sleep, stages, movement and a sleep score. | **Timing and duration: high. Stages and score: low.** | Garmin Vivosmart 4 vs polysomnography (PSG): sleep sensitivity 0.98 but wake specificity about 0.30; overestimated total sleep by about 28 min; stage kappa 0.20; sleep onset and end times agreed well with PSG (Mouritzen et al., 2020). Forerunner 245: wake sensitivity 27%, total sleep overestimated by about 44 min, stage agreement 50% (Miller et al., 2022). Garmin Fenix 5S and Vivosmart 3 performed worse than actigraphy on sleep/wake measures; all devices did worse on disrupted nights (Chinoy et al., 2021). A systematic review rated Garmin Vivosmart 4 as moderate for stages and total sleep (Schyvens et al., 2024). Garmin states "The fēnix device is not a medical device". | Garmin fēnix 8 Owner's Manual, "Sleep Tracking"; Mouritzen et al. 2020; Miller et al. 2022; Chinoy et al. 2021; Schyvens et al. 2024 |
| **Stress** (0 to 100) | "Your device analyzes your heart rate variability while you are inactive to determine your overall stress." Bands: 0 to 25 rest, 26 to 50 low, 51 to 75 medium, 76 to 100 high. | **Medium**, if aggregated (for example, share of the day in rest band, or time in high band). Single readings are noisy. | In a preregistered lab study (n = 60), the Garmin stress score separated rest from mental-stress tasks and correlated with ECG heart rate and RMSSD, but predicted self-reported stress only weakly; plain heart rate did better (Rosenbach et al., 2025). Users of automatic stress trackers struggled with awareness, background knowledge and lack of social support to interpret the data (Ding et al., 2021). It is physiological arousal, not "felt stress". | Garmin manual, "Heart Rate Variability and Stress Level"; Connect IQ ActivityMonitor.Info; Rosenbach et al. 2025; Ding et al. 2021 |
| **HRV status** | Overnight HRV from wrist heart rate; the glance shows a seven-day average against a personal baseline (Balanced, Unbalanced, Low, Poor). Needs three weeks of consistent sleep data. | **Conceptually ideal for weekly** (it is already a 7-day value), but not exposed to Connect IQ in the docs reviewed. | Garmin Fenix 6 nocturnal RMSSD against ECG: concordance 0.87, mean absolute percentage error 10.5%, the lowest of five devices tested (Dial et al., 2025). Forerunner 245 HRV agreement was poor (ICC 0.24) when measured before sleep (Miller et al., 2022). | Garmin fēnix 8 Owner's Manual, "Heart Rate Variability Status"; Dial et al. 2025; Miller et al. 2022 |
| **Resting heart rate** | Garmin reports a daily resting HR; Dial et al. report Garmin defines it as the lowest 30-minute average in 24 hours. Connect IQ exposes a seven-day average. | **High** as "today vs my usual" across the week (what Offshift's heart signal already does). | Dial et al. (2025) could not validate Garmin RHR because Garmin does not say when the 30-minute window occurred. Forerunner 245 overestimated overnight HR by about 5 bpm (Miller et al., 2022). Across 158 studies, Garmin and Apple were among the more accurate brands for heart rate (Fuller et al., 2020). | Connect IQ UserProfile docs; Dial et al. 2025; Miller et al. 2022; Fuller et al. 2020 |
| **Respiration** | Breaths per minute; glance shows current value and a 7-day average. Overnight respiration feeds Health Status. | **Low to medium.** Usually stable; only meaningful as "outside your usual". | **No independent validation of Garmin respiration found (unverified).** | Garmin fēnix 8 Owner's Manual, "Glances"; Connect IQ ActivityMonitor.Info |
| **Pulse Ox (SpO2)** | Wrist optical estimate of peripheral oxygen saturation; modes: all day, during sleep, on demand. | **Low.** Little expected week-to-week meaning for healthy young workers, and readings are fragile. | Garmin: "Unusual sleep positions can cause abnormally low sleep-time SpO2 readings"; fit, stillness and skin products matter. Fēnix 6 vs medical oximeter: concordance 0.10, only 59% of attempts gave a reading; authors judged it not accurate under any condition (Carrier et al., 2025). | Garmin fēnix 8 Owner's Manual, "Pulse Oximeter"; Carrier et al. 2025 |
| **Health Status** | Compares overnight heart rate, HRV, respiration, skin temperature and sleep SpO2 with a three-week personal baseline; blue = within baseline, orange = outside. | Not readable by Offshift, but a **useful design precedent**: "within your usual range" rather than good/bad. | No accuracy statement in the manual page. | Garmin fēnix 8 Owner's Manual, "Health Status" |
| **Steps and intensity minutes** | Daily steps; moderate-to-vigorous minutes against a weekly goal. | **Medium** as context: a standing retail or hospitality shift shows up as movement load. | Fuller et al. (2020) found step counting accurate in lab settings for several brands; validity varies by setting. Weekly goal framing is prescriptive and should not be shown. | Connect IQ ActivityMonitor.Info; Fuller et al. 2020 |
| **Recovery time, Training Readiness, Training Status** | Training Readiness combines last night's sleep score, recovery time, HRV status, acute load, sleep history (3 nights) and stress history (3 days). Bands from "Poor, let your body recover" to "Prime". | **Low for Offshift.** Built for athletes, and its labels give advice. | Composite of the above; inherits their errors. Its wording ("time to slow down") conflicts with the "no health advice" rule. | Garmin fēnix 8 Owner's Manual, "Training Readiness" |

### 1.3 What is meaningful at a weekly timescale

- **Robust enough for a week view:** sleep window timing and duration (onset and end agree well with PSG even when stages do not), overnight recharge as a relative measure, resting HR against the worker's own seven-day usual, daily aggregates of stress bands, steps.
- **Noisy at any timescale:** sleep stages, SpO2, single-moment stress values, single-night HRV.
- **Needs time before it means anything:** Garmin itself withholds HRV status and Health Status until three weeks of data exist. Offshift should likewise show "still learning your usual" for a new watch rather than guessing.

A sleep expert in Ravichandran et al. (2017) put the weekly argument plainly: focus "more on the trends than ... on just the night to night scores".

---

## 2 Shift work, students and the body

### 2.1 Who Offshift is for

- In August 2025 about 2.4 million Australian employees (19%) described their job as casual; just under half of them were aged 15 to 24, and 61% had no guaranteed minimum hours (ABS media release, 12 December 2025).
- In the 2017 Universities Australia Student Finances Survey, 30% of students worked more than 20 hours a week (up from 16% in 2006), and 40% said paid work was affecting their studies (as reported by Griffin & Crossley, 2018, UNSW Newsroom). **(The primary survey report was not opened; figures are from the UNSW summary.)**

### 2.2 Working while studying and sleep

- In a survey of 330 US college students, employed students had about twice the odds of insomnia after adjustment (OR 2.10, 95% CI 1.05 to 4.18) (Mbous et al., 2022). The unadjusted comparison was not significant, so treat this as an association.
- In 736 students across six US universities, those working in the service industry had slightly lower sleep scores than students working elsewhere, and grade average was associated with sleep and work hours (Chiang, Arendt & Sapp, 2020; abstract only).
- A review of college student sleep reports that about 70% get insufficient sleep and 50% report daytime sleepiness, with irregular schedules common (Hershner & Chervin, 2014).

### 2.3 Irregular and unpredictable schedules

- Schneider & Harknett (2019) surveyed 27,792 hourly retail and food-service workers. Half had worked a "clopening" (closing then opening), a third got less than a week's notice of their roster, and hours varied by 32% between their busiest and quietest week. Unstable, unpredictable schedules were more strongly associated with psychological distress, poor sleep and unhappiness than low wages were, mostly through work-life conflict. 82% of workers who had a shift cancelled reported poor sleep quality, against 72% of those who had not. Their models predict that removing on-call shifts would improve sleep quality by about 8 percentage points, with similar effects for removing clopenings.
- This is directly relevant: the "can you cover tonight?" ask is itself a short-notice schedule change. The research suggests the *unpredictability* matters, not only the hours.

### 2.4 Late finishes and short gaps

- A systematic review of "quick returns" (11 hours or less between shifts) found the most common one is evening to next morning; it shortened sleep, often to 6.5 hours or less, and sleep tended to lengthen on the first night after, which the authors read as recovery. Effects on acute sleep, sleepiness and fatigue were fairly consistent; effects on long-term health were inconclusive (Vedaa et al., 2016).
- A BMJ review of 38 meta-analyses and 24 systematic reviews concludes that shift work mainly causes acute sleep loss around night and early-morning shifts; whether insufficient sleep is the causal pathway to longer-term disease is not settled (Kecklund & Axelsson, 2016; abstract).
- In 113 hospital nurses tracked with wearables for 10 weeks, night-shift nurses were more sedentary, reported lower life satisfaction and poorer sleep, possibly linked to difficulty falling asleep on days off (Feng et al., 2021).

### 2.5 Rest is more than sleep

Sonnentag & Fritz (2007) distinguish four recovery experiences after work: psychological detachment, relaxation, mastery and control over one's own time. This supports showing "rest" as something the worker defines (a free evening, a gym session, time with friends), not only as a sleep metric.

### 2.6 What this means for the design

- The meaningful unit is the **sequence**: shift end time, gap to the next commitment, the following night's recharge, and how the next day went. A week is the smallest view in which these sequences repeat.
- **Notice given** and **whether the shift was an extra ask** are useful context layers, because unpredictability itself relates to sleep and distress.
- Avoid health-outcome claims. The evidence on long-term harm is mixed; the evidence on short-term sleep loss after late finishes is stronger. Offshift can show the worker their own short-term pattern without saying what it means for their health.

---

## 3 Reflection and personal informatics theory

### 3.1 Models of self-tracking

- **Stage-based model (Li, Dey & Forlizzi, 2010).** Five stages: preparation, collection, integration, reflection, action. Barriers cascade from earlier stages to later ones. Reflection barriers reported by 68 respondents included lack of time (10), visualization problems (6), **self-criticism (5)**, interpretation (5), **no context (3)** and sparse data (3). The authors distinguish short-term reflection (current status) from long-term reflection (comparisons over days or weeks that reveal trends), and recommend supporting "associating multiple facets of people's lives". *Offshift mapping:* collection is automatic on the watch; integration is the calendar alignment; reflection is the weekly view; action stays with the worker (how they answer a shift ask).
- **Lived informatics (Epstein et al., 2015; Rooksby et al., 2014).** People track out of curiosity and for instrumental reasons, not only for behaviour change; they lapse (forgetting, upkeep, skipping, suspending) and sometimes resume. Rooksby et al. found tracking is often interpreted against short-term goals and daily decisions, and some people track in a "documentary" style. *Offshift mapping:* the decision a worker faces (a shift ask) is exactly this kind of short-term decision; gaps in wear should be expected and handled gracefully.
- **Pitfalls (Choe et al., 2014).** From 52 Quantified Self talks: tracking too many things, not tracking triggers and context, and lacking rigour. *Mapping:* fewer signals plus more context.
- **Novices (Rapp & Cena, 2016).** Fourteen first-time trackers found collection burdensome with no clear reward; apps that offered no suggestions for using the data and "overly abstract" visualisations left them without insight, and their interest faded (abstract). This is a caution against making the week view too cryptic.

### 3.2 What reflection is, and how design supports it

- **Reflection is under-defined and often confused with persuasion.** A review found most HCI work on reflection does not define it, and most evaluations measure something else (Baumer et al., 2014).
- **Breakdown, inquiry, transformation (Baumer, 2015).** Three dimensions of reflection identified from theory (abstract). For Offshift: a breakdown is a moment that doesn't fit ("why was Thursday so flat?"), inquiry is looking back with context, transformation is a changed understanding of how work fits with rest.
- **Levels of reflection (Fleck & Fitzpatrick, 2010).** A framework covering purposes, conditions and levels of reflection, and how technology can support each (abstract). The levels are commonly summarised as R0 description through R4 critical reflection that links experience to wider social and ethical issues; Bentvelzen et al. (2022) confirm the five-level R0 to R4 structure. **(The exact level definitions were not checked against the original PDF; unverified.)** R4 is notable for Offshift, since a worker might move from "I'm tired" to "this roster practice is unfair".
- **Four design resources (Bentvelzen et al., 2022).** From 52 reflection artefacts and app reviews: temporal perspective (past, future, memories, slowness), conversation (with others or with technology), comparison (to a norm or to others), and discovery (ambiguity, provocation, reframing). They note that reflection "often does not occur automatically, but needs to be encouraged".
- **Ambiguity as a resource (Gaver, Beaver & Benford, 2003).** Ambiguity of information, context and relationship can invite personal interpretation instead of handing over a fixed answer. *Tension with Rapp & Cena:* ambiguity should be in the *meaning* (what the worker makes of it), not in *legibility* (whether they can read the chart).
- **Insight types (Choe, Lee & schraefel, 2015).** From 30 Quantified Self presentations: detail, self-reflection, trend, comparison, correlation, data summary, distribution and outlier. A week view naturally supports trend, comparison (this week vs usual) and outlier.
- **Visual exploration (Choe et al., 2017).** Most tools offer "simple feedback" and little support for deeper reflection; the authors built Visualized Self to let people ask questions of longitudinal data (abstract).
- **Calendar context (Huang, Tory & Bartram, 2016).** In an eight-week field study, linking Fitbit data with Google Calendar gave "rich context"; people mostly made comparisons and mapped data to calendar events, recalled experiences with emotion, and one participant began adding calendar events purely to explain her data. The visualisation did not give direct "do this" insights; the influence on action was slower and longer term.
- **Natural-language patterns (Bentley et al., 2013).** Health Mashups presented statistically significant links between wellbeing data and context (including calendar data) as sentences, for example "You are happier on days when you sleep more"; links were highly individual.
- **Evidence for behaviour change is thin (Kersten-van Dijk et al., 2017).** Only 24 of 6,568 studies met criteria for testing whether personal informatics produces actionable self-insight; results were promising but methodologically weak. Offshift should not claim it will change behaviour, which also fits its care rules.

### 3.3 Design qualities that support reflection (synthesis)

| Quality | Why | Sources |
|---|---|---|
| Context next to data | "No context" is a reflection barrier; calendar context improved reasoning | Li et al. 2010; Choe et al. 2014; Huang et al. 2016 |
| Temporal comparison with oneself | Long-term reflection reveals trends; temporal perspective is a core resource | Li et al. 2010; Bentvelzen et al. 2022; Garmin Health Status baseline |
| Annotation by the worker | Context the sensor misses; people annotate spontaneously when allowed | Choe et al. 2014; Huang et al. 2016 |
| Openness of meaning, clarity of form | Ambiguity invites interpretation, but abstract visuals can block novices | Gaver et al. 2003; Rapp & Cena 2016 |
| Questions, not verdicts | Reflection needs a prompt; avoid sliding into persuasion | Baumer et al. 2014; Bentvelzen et al. 2022 |
| Low effort, tolerant of lapses | Burden and lapses are normal | Epstein et al. 2015; Rapp & Cena 2016 |
| Room for conversation | Reflection is often social; workers may want to talk it through with peers | Bentvelzen et al. 2022; Rooksby et al. 2014 |

---

## 4 Visualizing a week of body data

### 4.1 Calendar-aligned layers

- **Evidence:** Huang et al. (2016) overlaid data as a grey line layer on the calendar's week view; participants said it did not interfere with normal calendar use, and the week view was where they most easily related data to events. Van Wijk & van Selow (1999) showed that a calendar layout reveals patterns on several timescales at once (days, weeks) and makes exceptional days stand out.
- **Epstein et al. (2014)** found that "cuts" of data by shared feature (for example by weekday, or by commute) helped people find patterns; participants preferred compact tables and graphs over a raw daily lifelog, and found value in seeing several cuts together.
- **Pattern for Offshift:** shifts, classes and rest as the base layer; one thin body band per day per signal aligned to the same time axis; an optional "cut" view that groups days by type (shift day, late-finish day, day off).

### 4.2 Glanceable and ambient (the watch side)

- Over 70% of tracker use is quick glances of about five seconds; six qualities of glanceable feedback are being abstract, integrating with existing activities, supporting comparisons, being actionable, building checking habits and acting as a gateway to deeper engagement (Gouveia et al., 2016).
- UbiFit Garden's phone wallpaper was a "non-literal, aesthetic image" and deliberately did not punish inactivity with "wilting flowers, weeds, or a stormy sky"; an empty week was simply sparse (Consolvo et al., 2008).
- Casual information visualisation frames everyday, non-expert, sometimes ambient displays as their own domain with different insight types from analytic tools (Pousman, Stasko & Mateas, 2007).
- **Pattern:** the watch shows today's levels at a glance; the weekly reflective view lives on the web calendar where there is room for context.

### 4.3 Aggregation, ranges and captions

- Show **levels and ranges**, not precise points. Sleep experts and users recommend ranges "to avoid false precision" (Ravichandran et al., 2017). Offshift's 0 to 3 levels are already a range encoding.
- **Captions** can summarise a pattern in words (Bentley et al., 2013; Epstein et al., 2014), but Epstein et al. found some people read captions as instructions. For Offshift, captions should describe or ask, not advise.

### 4.4 Showing uncertainty and missing data honestly

- Visual treatments that clearly mark missing values raised perceived data quality, while designs that break visual continuity lowered it and could bias interpretation (Song & Szafir, 2019).
- Discrete displays of uncertainty (quantile dotplots) helped non-experts reason about probability more consistently on small screens (Kay et al., 2016).
- **Pattern:** a visible "no reading" state (hatched or outlined) for nights the watch was off or readings were older than the 12-hour rule, never a silent zero or a smoothed line through the gap; a "still learning your usual" state for the first weeks.

### 4.5 Avoiding judgement

- Garmin's own Training Readiness uses labels like "Poor: let your body recover" and "time to slow down". These are advice, and they would break Offshift's care rules.
- Garmin's Health Status shows a gentler precedent: blue within baseline, orange outside, without saying good or bad.
- **Pattern:** a single-hue or neutral palette where colour encodes "lower / usual / higher than your usual", not red-good-bad; words such as "lower than usual" rather than "poor".

### 4.6 3D and physicalization

- **Caution:** Munzner's "No unjustified 3D" rule: planar position is a high-ranked channel and depth is not; 3D adds occlusion and perspective distortion that interfere with size comparisons; for time series, extruded 3D curves make detailed comparison impossible, and a calendar plus 2D curves works better.
- **Opportunity:** constructing or handling a personal physicalization intertwined data collection, construction and self-reflection, and gave "presence in everyday life" (Thudt et al., 2018). Physicalization is an active research area for helping people explore and communicate data (Jansen et al., 2015).
- **Pattern for Offshift's 3D calendar:** use 3D for the week as an object (days as blocks or slabs you can turn and pick up, shifts as solid volumes), and read values head-on: when a day is selected, rotate it to face the viewer and show its bands flat. Provide a flat 2D mode for comparison.

---

## 4b Showing body data inside the 3D week calendar

This section answers a narrower question: how to put body data *on* Offshift's Three.js week, where each day is a base tile and shifts, classes, plans and asks are vertical blocks placed by time of day, with height meaning duration. Shift blocks may soon carry a worker-rated difficulty colour, so body data must not compete for that channel.

### 4b.1 Integration strategies for a second data layer

- **Three building blocks (Gleicher et al., 2011; Gleicher, 2018).** All comparison designs are built from *juxtaposition* (items in different spaces, side by side), *superposition* (items in the same space, on top of each other) and *explicit encoding* (the relationship itself is computed and shown). Gleicher (2018) adds that superposition gets cluttered as more objects share a space, that juxtaposition relies on similar layouts to reduce the viewer's burden, and that explicit encodings require the relationship to be known in advance.
- **Five composition patterns (Javed & Elmqvist, 2012).** Juxtaposition, integration (juxtaposed views joined by explicit links), superimposition, overloading (a client visualisation drawn on top of a host without one-to-one spatial linking) and nesting. Deng et al. (2022), who revisited this taxonomy against a large corpus of VIS papers, describe the same five patterns. **(Javed & Elmqvist's full text was not opened; pattern descriptions come from the abstract and from Deng et al. 2022 and Gleicher 2018.)**
- **What fits Offshift's data.** The body data is coarse: one 0 to 3 level per signal per day, plus an overnight value that sits *between* two days. The events are fine-grained (time-of-day blocks). That mismatch argues against superimposing body data on the time-of-day axis, because there is no time-of-day body value to align with. It favours:
  - *juxtaposition at the day level*: a body element per day that shares the day's position but sits in its own region of the tile, and
  - *explicit encoding*: Offshift's levels already are an explicit encoding of a relationship ("compared with your usual"), which Gleicher (2018) notes is only possible when the relationship is known; here it is, because the watch computes it.
- **Layering precedent on calendars.** Huang, Tory & Bartram (2016) superimposed fitness data as a grey line on the calendar week view; participants said it did not interfere with ordinary calendar use. That supports a low-salience, neutral body layer that stays in the background until the worker looks for it.

### 4b.2 Calendar-based precedent

- **Calendar layout for daily patterns (van Wijk & van Selow, 1999).** Clustering daily profiles and colouring the corresponding days on a calendar reveals routine and exceptional days on several timescales at once. This is the ancestor of the "calendar heatmap": one coloured cell per day.
- **Personal data on a calendar (Huang et al., 2016).** Comparisons and mapping data to events were the most common tasks; the week view best supported explaining patterns (Section 3.2).
- **Calendar data as context for correlations (Bentley et al., 2013).** Health Mashups used calendar data as one of the context streams correlated with sleep, steps and mood, presented in sentences rather than charts.
- **Cuts by day type (Epstein et al., 2014).** Grouping days by a shared feature (for example, day of week) and showing compact tables or graphs helped people find patterns; a selectable calendar was used for daily comparison.
- **Always-visible, low-burden surfaces (Choe et al., 2015).** In SleepTight, home-screen widgets that kept sleep data visible raised diary compliance from 73% to 92% and "encouraged self-reflection". Body data that lives where people already look is more likely to be seen.
- **Too many facets overload people (Jones & Kelly, 2017).** In a 3-month study of a multifaceted personal informatics system, showing every correlation overwhelmed participants; filtering cut what was shown by about 55% and raised the share rated interesting to about 81%. On the calendar, this argues for few signals and letting the worker choose which are visible.
- **Gap.** I found no published study of calendar heatmaps for *sleep or body data specifically*, and no study of how shift workers read biometric overlays next to a roster. Huang et al. (2016) is the closest evidence. This is worth testing directly (Section 7).

### 4b.3 3D: when it helps, when it hurts, and which channels are safe

**Evidence that 3D hurts value reading**
- Munzner's rules of thumb: planar position is the top-ranked channel for ordered data and depth is not; occlusion "hides information" and interaction to resolve it costs time and cognitive load; perspective distortion interferes with size encodings; tilted text is far less legible; for time series, extruded 3D curves make detailed comparison impossible and a calendar plus 2D curves is better (Munzner, VAD rules slides).
- Adding 3D perspective depth cues to bar graphs lowered accuracy of height estimates; the height of *neighbouring* elements biased judgements by about an order of magnitude more (Zacks et al., 1998). Implication: a body bar standing next to tall shift blocks would be misread because of the blocks around it.
- More freedom to place items in depth made spatial memory *worse*, in both physical and virtual models, and people rated deeper layouts as more cluttered (Cockburn & McKenzie, 2002).
- Occlusion in 3D harms discovery, access and spatial relations; Elmqvist & Tsigas (2008) classify 50 occlusion-management techniques into design patterns including multiple viewports, virtual X-ray, tour planners, interactive exploders or probes, and projection distorters (pattern names confirmed from the authors' slides).

**Evidence that 3D can help**
- 3D offers extra position and length dimensions, surfaces, lighting and separation, and can help people build mental models of data arranged in a spatial framework (Brath, 2014; abstract).
- In a controlled study (N = 48), 3D heatmaps with height gave fewer errors when reading and comparing *single* values, but 2D heatmaps were better for *overview* tasks (Kraus et al., 2020). A weekly reflective glance is an overview task.

**Channel guidance for the Offshift scene (synthesis)**

| Channel in the 3D scene | Safe for body levels? | Reason |
|---|---|---|
| Height of a block or bar | **No** | Already means duration; perspective distortion and neighbour effects (Munzner; Zacks et al., 1998) |
| Area or volume | **No** | Ranks low for ordered data and is distorted by perspective (Munzner) |
| Spatial region on the tile floor (a dedicated strip) | **Yes** | Spatial region is a strong identity channel; keeps body data apart from blocks (Munzner) |
| Luminance or saturation steps of one neutral hue, on a flat surface | **Yes, with care** | Luminance and saturation are magnitude channels suited to ordered levels (Munzner); scene lighting will shift apparent luminance with angle, so use unlit or evenly lit materials **(design reasoning, not tested)** |
| Hue | **Avoid for levels** | Hue is an identity (categorical) channel, not an ordered one (Munzner); and hue is likely to be taken by work difficulty |
| Texture or hatching | **Yes, for "no reading" only** | Visibly marking missing values raised perceived data quality (Song & Szafir, 2019) |
| Glyph shape | **Limited** | Compact for several signals (Borgo et al., 2013), but shape interferes with colour and size perception (Smart & Szafir, 2019) |
| Lighting, glow or ambient effects | **Not for data** | Brath (2014) lists lighting as a 3D attribute, but I found no evidence it can carry ordinal levels reliably; reserve it for selection or focus **(unverified as an encoding)** |

### 4b.4 Encoding ordinal levels and missing data honestly

- **Ordered levels use an ordered channel.** Four levels (0 to 3) map well to four luminance or saturation steps of one hue (Munzner); ColorBrewer's guidance is to match the scheme to the data type (sequential for ordered data) and to the number of classes (Harrower & Brewer, 2003).
- **No judgement colours.** Avoid red-to-green and any diverging "good/bad" scheme; UbiFit Garden deliberately showed lack of activity as sparse rather than wilting (Consolvo et al., 2008), and self-criticism is a reflection barrier (Li et al., 2010). (A common additional reason is red/green colour-vision deficiency; I did not open a source for this in this research, so it is **unverified here**.)
- **"No reading" must not look like "low".** Use a different *kind* of mark, not the lightest step of the ramp: an outlined, hatched or empty cell, labelled "no reading" on hover. Song & Szafir (2019) found that designs highlighting missing values increased perceived data quality, while designs that broke visual continuity reduced it and could bias interpretation. Readings past Offshift's 12-hour rule are a third state ("stale"), for example outline only.
- **Separable from difficulty colour.** Separate by *location* (floor strip, not the block), by *mark type* (flat cells, not volumes) and by *channel* (luminance of one neutral hue, versus difficulty's hues). Smart & Szafir (2019) show that channels people assume are separable (shape, size, colour) actually interfere, and asymmetrically, so this separation should be checked with users rather than assumed.
- **Overnight data belongs between days.** Overnight recharge is not a property of Tuesday or Wednesday; drawing it in the seam between two tiles makes the "shift end, night, next day" sequence (Section 2) visible in the geometry itself **(design proposal)**.

### 4b.5 Design options for Offshift

**Option 1: Floor rail with overnight bridges (juxtaposition inside the tile)**
A thin flat strip along the front edge of each day tile, split into one small cell per visible signal (for example stress share, resting heart, activity), each cell shaded in four luminance steps of one neutral hue. Overnight recharge is a short flat "bridge" in the gap between consecutive tiles. Missing data is hatched; stale data is outlined.
- *Pros:* stays in the plane of the floor (power of the plane); never occluded by blocks if on the camera-facing edge; does not touch the block colour channel; overnight placement mirrors the sequence story; calendar-heatmap logic (van Wijk & van Selow, 1999).
- *Cons:* small cells at a distance; foreshortened at low camera angles (perspective); needs a legend and some learning.
- *Evidence:* Munzner; Gleicher (2018); Huang et al. (2016); Song & Szafir (2019); Zacks et al. (1998) (why not bars).

**Option 2: Tinted day tile (superposition, calendar heatmap)**
The whole base tile is shaded by one chosen signal (for example overnight recharge for the night before), the worker picks which signal via a toggle.
- *Pros:* the most glanceable; strong precedent in calendar heatmaps (van Wijk & van Selow, 1999); one signal at a time reduces overload (Jones & Kelly, 2017).
- *Cons:* only one signal visible; the tile is partly hidden under blocks (occlusion); large tinted areas sit right under difficulty-coloured blocks and will visually compete; scene lighting changes apparent tile shade.
- *Evidence:* van Wijk & van Selow (1999); Munzner (occlusion); Smart & Szafir (2019) (channel interference).

**Option 3: Corner glyph per day**
A small multi-segment glyph (for example a four-segment ring or four stacked pips) at a tile corner, one segment per signal, filled by level.
- *Pros:* compact; shows several signals; can face the camera (billboarded) to avoid perspective distortion.
- *Cons:* harder to read and compare across days; shape and colour interact (Smart & Szafir, 2019); glyphs need learning (Borgo et al., 2013); no natural place for overnight data.
- *Evidence:* Borgo et al. (2013); Smart & Szafir (2019).

**Option 4: Linked flat "body strip" beside the 3D week (juxtaposed 2D view)**
A 2D grid under or beside the 3D scene, one column per day aligned with the tiles, one row per signal, plus a row of overnight cells between columns. Hovering a day highlights the tile in 3D and vice versa.
- *Pros:* best for reading and comparing levels across the week (Munzner; Kraus et al., 2020 for overview); no occlusion or perspective; easy to show missing data honestly.
- *Cons:* body data is no longer *on* the calendar; the viewer must link two views (Javed & Elmqvist, 2012; Gleicher, 2018), so it needs good brushing and alignment.
- *Evidence:* Munzner; Kraus et al. (2020); Gleicher (2018); Epstein et al. (2014) (compact tables and graphs preferred).

**Recommendation.** Combine **Option 1 in the 3D scene** with a **"read flat" camera preset** that turns Option 1 into Option 4 without a second view: one tap moves the camera to a top-down orthographic view of the week, where the floor rails and overnight bridges line up as a 2D calendar heatmap with no perspective distortion, and the blocks become flat outlines. This keeps body data literally on the calendar (the student's goal), keeps height reserved for duration, keeps hue free for difficulty, and gives the overview task the 2D reading it needs. Default to two or three signals visible, chosen by the worker. Test Option 2 as an alternative "one signal" mode only if workers ask for a stronger at-a-glance cue. **(The orthographic preset is a design proposal derived from the cited evidence, not a tested pattern.)**

---

## 5 Risks and mitigations

| Risk | Evidence | Mitigation in Offshift |
|---|---|---|
| **Over-quantification** makes everyday life feel like work | Measurement increased activity but reduced enjoyment and continued engagement across six experiments (Etkin, 2016) | Weekly view, not constant scoring; no targets, streaks or goals; easy to hide a signal |
| **Anxiety and perfectionism** about sleep data | "Orthosomnia": patients trusted tracker data over PSG and spent extra time in bed to raise totals (Baron et al., 2017); tracker feedback pushed users towards goals in tension with sleep science (Ravichandran et al., 2017) | No sleep score or stages; recharge shown as a range; never frame a night as failed; clinicians in Baron et al. recommend using trackers for timing rather than minute-level estimates |
| **Self-criticism** | Self-criticism was a reflection barrier for 5 of 68 people (Li et al., 2010) | Non-judgemental language and colour; positive or neutral empty states (Consolvo et al., 2008) |
| **Misinterpretation and false precision** | Sleep staging, Garmin HRV and SpO2 have weak validity (Section 1); self-trackers often draw unrigorous conclusions (Choe et al., 2014) | Drop weak signals; show ranges; one plain-language "what this can and can't tell you" note per signal; Garmin's own "not a medical device" stance |
| **Data disagrees with how the worker felt** | Garmin stress weakly predicts self-reported stress (Rosenbach et al., 2025); sleep scores often don't match perceived sleep (Ravichandran et al., 2017) | Show the worker's own rating next to the sensor band, with the worker's view given equal or greater visual weight |
| **Employer access and surveillance** | Law offers weak limits on worker monitoring including wellness wearables (Ajunwa et al., 2017; a US analysis); employees see both benefits and loss of privacy and freedom (Mettler & Wulf, 2019); workplace tracking raises surveillance and work-life boundary concerns (Chung et al., 2017); in Australia the employee records exemption can cover employee health information held by private employers (OAIC) | Raw data stays on the watch; weekly view is private and local to the worker; nothing body-related ever goes to the manager; any reply to a shift ask is composed by the worker in their own words and does not include levels |
| **Social pressure and moral accounting** | In a workplace step campaign, steps became a socially negotiated quantity and the campaign affected those who opted out too (Gorm & Shklovski, 2016) | No team leaderboards, no "share your week" defaults; sharing is per item and opt-in |
| **Power imbalance in casual work** | Short notice, cancellations and clopenings are common and linked to distress (Schneider & Harknett, 2019) | Frame the view as the worker's evidence for their own decisions, not as proof of fitness to work; never imply a worker should accept or decline |
| **Lapses and abandonment** | Lapsing is a normal stage (Epstein et al., 2015); novices drop off without clear value (Rapp & Cena, 2016) | Missing nights shown honestly but without guilt; the week still works with partial data; easy to resume |

---

## 6 Recommended data set and visualization principles for Offshift

### 6.1 Recommended data set

| Layer | Include | Status | Rationale |
|---|---|---|---|
| Life context | Shifts (start, end, finish time), gap to next commitment, whether the shift was an extra ask and how much notice was given, classes, worker-marked rest | Core | Sequences and unpredictability drive short-term sleep and distress (Vedaa et al., 2016; Schneider & Harknett, 2019); context is a reflection prerequisite (Li et al., 2010; Huang et al., 2016) |
| Worker's own voice | One-tap "how did today feel" (3 to 5 options, no numbers), free-text notes | Core | Subjective sleep and stress don't match sensors (Ravichandran et al., 2017; Rosenbach et al., 2025); annotation supports reasoning (Huang et al., 2016) |
| Overnight recharge | Body Battery gained in the sleep window, as 0 to 3 level against usual | Core | Most direct "did I recover" signal available via Connect IQ; label honestly (Garmin manual) |
| Sleep window | Bedtime and wake time, duration | Core if readable; otherwise derive from the user's configured sleep window and recharge timing | Timing and duration are the most valid sleep measures (Mouritzen et al., 2020; Miller et al., 2022) |
| Daytime load | Share of the day in Garmin's rest band versus higher bands; Body Battery drain | Core, aggregated only | Discriminates rest from stress in the lab; single values unreliable (Rosenbach et al., 2025) |
| Heart | Resting HR versus the worker's own 7-day average | Core | Personal-baseline comparison; Garmin among the better brands for HR (Fuller et al., 2020) |
| Movement | Steps or active minutes | Optional | Context for physically demanding shifts; no goals shown |
| Breathing | Respiration versus usual | Optional, hidden by default | No independent validation found; low expected weekly variation |
| Pulse ox | SpO2 | **Exclude from weekly view** | Poor validity on fēnix 6 (Carrier et al., 2025); sleep-position artefacts (Garmin manual) |
| Sleep stages, sleep score | | **Exclude** | Weak staging validity; scores drive orthosomnia (Baron et al., 2017; Ravichandran et al., 2017) |
| Training readiness, recovery time | | **Exclude** | Athlete-oriented and phrased as advice |

### 6.2 Principles, each tied to evidence

1. **Week as the unit, sequences as the story.** Show each day's shift, the night after and the next day together, so late-finish patterns appear over the week. *Evidence:* Vedaa et al. 2016; Kecklund & Axelsson 2016; Li et al. 2010 (long-term reflection); Ravichandran et al. 2017 (trends over nights).
2. **Data lives on the calendar.** Body bands sit on the same time axis as shifts and classes. *Evidence:* Huang et al. 2016; van Wijk & van Selow 1999; Li et al. 2010 (multi-faceted association).
3. **Compare with yourself, in ranges.** Use the 0 to 3 levels relative to the worker's own usual; show "still learning" until a baseline exists. *Evidence:* Ravichandran et al. 2017; Garmin HRV Status and Health Status (three-week baselines).
4. **Fewer, sturdier signals.** Core set of four body signals plus context; drop SpO2 and sleep stages. *Evidence:* Choe et al. 2014 (tracking too many things); validation studies in Section 1.
5. **The worker interprets; the system asks.** Prompts are open questions; captions describe, never advise; no diagnosis. *Evidence:* Baumer et al. 2014; Baumer 2015; Bentvelzen et al. 2022; Kersten-van Dijk et al. 2017.
6. **Felt experience sits beside sensed data.** A self-rating and notes are first-class layers. *Evidence:* Rosenbach et al. 2025; Ravichandran et al. 2017; Choe et al. 2014.
7. **Honest gaps.** Missing and stale data are marked visibly and neutrally, never smoothed or zero-filled. *Evidence:* Song & Szafir 2019; Offshift's 12-hour rule; Epstein et al. 2015 (lapses).
8. **No judgement colours or words.** Neutral palette for "lower / usual / higher", no red for "bad", no failure states. *Evidence:* Consolvo et al. 2008; Li et al. 2010 (self-criticism); Baron et al. 2017.
9. **3D frames the week; 2D carries the values.** Body levels sit in a flat floor rail on each tile, overnight recharge between tiles, never as block height or hue; a top-down "read flat" view supports comparison (Section 4b). *Evidence:* Munzner (VAD rules); Zacks et al. 1998; Cockburn & McKenzie 2002; Kraus et al. 2020; Gleicher 2018; Thudt et al. 2018; Jansen et al. 2015.
10. **Private by default, shared by choice, never to the employer.** *Evidence:* OAIC employee records exemption; Ajunwa et al. 2017; Chung et al. 2017; Mettler & Wulf 2019; Gorm & Shklovski 2016.
11. **Glance on the wrist, reflect on the web.** The watch stays glanceable for in-the-moment shift asks; the weekly view is for slower reflection. *Evidence:* Gouveia et al. 2016; Li et al. 2010 (short-term vs long-term reflection); Pousman et al. 2007.

### 6.3 Why this process

Offshift's pipeline follows the stage-based model: the watch automates collection (reducing burden, Rapp & Cena 2016), the calendar does integration (Li et al. 2010), the weekly view supports reflection, and action stays entirely with the worker. Lived informatics research says people track for curiosity and short-term decisions and that lapses are normal (Epstein et al., 2015; Rooksby et al., 2014), which fits a tool used around specific moments (a shift ask) and reviewed weekly rather than one demanding daily compliance. Rosters in casual work are often short-notice and weekly in rhythm (Schneider & Harknett, 2019), so a weekly reflective cadence matches the worker's own planning horizon.

---

## 7 Open questions to test with workers

1. Do workers read "overnight recharge" as sleep? Does that label help or confuse?
2. Which context layers matter most to them: finish time, gap to next commitment, notice given, or "this was an extra ask"?
3. Does seeing a late-finish pattern feel useful, or does it feel like evidence against them?
4. Is a 0 to 3 level enough, or do they want to see the number underneath? Does the number trigger worry?
5. What does "usual" mean to someone with no regular week? Should the baseline be the last 7 days, the last 3 weeks, or "weeks like this one"?
6. How do they want to mark rest? Is sleep enough, or do they want to log detachment, social time or exercise (Sonnentag & Fritz, 2007)?
7. When the watch and their feeling disagree, which do they trust, and how should the view handle it?
8. Which single body signal would they keep if they could keep only one? Which would they turn off?
9. Does the 3D week help them remember the week, or get in the way of reading it? Do they use a flat mode?
10. When would they actually look: Sunday night, payday, roster release, or just before answering an ask?
11. Is there any situation where they would want to share something from the weekly view with a manager, and what exactly? Or with a friend or partner?
12. Do prompts like "What was different about Thursday?" feel supportive or intrusive?
13. On the 3D calendar, can workers tell "no reading" from "low" at a glance, and can they read body levels and shift difficulty colour at the same time without confusing them?
14. Do workers use the floor rail in the angled 3D view, or only in the top-down "read flat" view? Which signals do they choose to keep visible?

---

## References

All sources were opened during this research. Where only an abstract or record was available, this is noted.

**Garmin documentation**

- Garmin. (n.d.). *fēnix 7 Series Owner's Manual: Body Battery*. https://www8.garmin.com/manuals-apac/webhelp/fenix7series/EN-SG/GUID-B81E5BBF-788F-408C-8740-F3D8AC984CDA-4288.html (used for the Body Battery definition; the equivalent fēnix 8 page was not located)
- Garmin. (n.d.). *fēnix 8 Series Owner's Manual: Heart Rate Variability Status*. https://www8.garmin.com/manuals/webhelp/GUID-EECCAC99-90D6-4AB1-9A3A-EC433D3365E2/EN-US/GUID-9282196F-D969-404D-B678-F48A13D8D0CB.html (content seen via search result summary)
- Garmin. (n.d.). *fēnix 8 Series Owner's Manual: Health Status*. https://www8.garmin.com/manuals/webhelp/GUID-EECCAC99-90D6-4AB1-9A3A-EC433D3365E2/EN-US/GUID-6335963E-C254-4239-9450-A0212850F303.html
- Garmin. (n.d.). *fēnix 8 Series Owner's Manual: Pulse Oximeter*. https://www8.garmin.com/manuals/webhelp/GUID-EECCAC99-90D6-4AB1-9A3A-EC433D3365E2/EN-US/GUID-4D425925-D4EE-4C26-B974-5375D0670860.html
- Garmin. (n.d.). *fēnix 8 Series Owner's Manual: Sleep Tracking*. https://www8.garmin.com/manuals/webhelp/GUID-EECCAC99-90D6-4AB1-9A3A-EC433D3365E2/EN-US/GUID-70D41BFB-2BB2-4933-BF95-47FF63140112.html
- Garmin. (n.d.). *fēnix 8 Series Owner's Manual: Glances*. https://www8.garmin.com/manuals/webhelp/GUID-EECCAC99-90D6-4AB1-9A3A-EC433D3365E2/EN-US/GUID-97EA1540-A780-480F-BA4D-9A9E147FB225.html
- Garmin. (n.d.). *fēnix 8 Series Owner's Manual: Training Readiness*. https://www8.garmin.com/manuals/webhelp/GUID-EECCAC99-90D6-4AB1-9A3A-EC433D3365E2/EN-US/GUID-C21BE0C8-A08E-4DA1-B6C6-2E0E2DDDB372.html
- Garmin. (n.d.). *Owner's Manual: Heart Rate Variability and Stress Level*. https://www8.garmin.com/manuals/webhelp/legacy/EN-US/GUID-9282196F-D969-404D-B678-F48A13D8D0CB.html
- Garmin. (n.d.). *Connect IQ API: Toybox.SensorHistory*. https://developer.garmin.com/connect-iq/api-docs/Toybox/SensorHistory.html
- Garmin. (n.d.). *Connect IQ API: Toybox.ActivityMonitor.Info*. https://developer.garmin.com/connect-iq/api-docs/Toybox/ActivityMonitor/Info.html
- Garmin. (n.d.). *Connect IQ API: Toybox.UserProfile.Profile*. https://developer.garmin.com/connect-iq/api-docs/Toybox/UserProfile/Profile.html
- Garmin. (n.d.). *Connect IQ API: Toybox.Complications*. https://developer.garmin.com/connect-iq/api-docs/Toybox/Complications.html

**Validation studies**

- Carrier, B., Marten Chaves, S., & Navalta, J. W. (2025). Validation of aerobic capacity (VO2max) and pulse oximetry in wearable technology. *Sensors, 25*(1), 275. https://doi.org/10.3390/s25010275
- Chinoy, E. D., Cuellar, J. A., Huwa, K. E., Jameson, J., Watson, C. H., Bessman, S. C., Hirsch, D. A., Cooper, A. D., Drummond, S. P. A., & Markwald, R. R. (2021). Performance of seven consumer sleep-tracking devices compared with polysomnography. *Sleep, 44*(5), zsaa291. https://doi.org/10.1093/sleep/zsaa291 (abstract)
- Dial, M. B., Hollander, M. E., Vatne, E. A., Emerson, A. M., Edwards, N. A., & Hagen, J. A. (2025). Validation of nocturnal resting heart rate and heart rate variability in consumer wearables. *Physiological Reports, 13*(16), e70527. https://doi.org/10.14814/phy2.70527
- Fuller, D., Colwell, E., Low, J., Orychock, K., Tobin, M. A., Simango, B., Buote, R., Van Heerden, D., Luan, H., Cullen, K., Slade, L., & Taylor, N. (2020). Reliability and validity of commercially available wearable devices for measuring steps, energy expenditure, and heart rate: Systematic review. *JMIR mHealth and uHealth, 8*(9), e18694. https://doi.org/10.2196/18694 (abstract)
- Miller, D. J., Sargent, C., & Roach, G. D. (2022). A validation of six wearable devices for estimating sleep, heart rate and heart rate variability in healthy adults. *Sensors, 22*(16), 6317. https://doi.org/10.3390/s22166317
- Mouritzen, N. J., Larsen, L. H., Lauritzen, M. H., & Kjær, T. W. (2020). Assessing the performance of a commercial multisensory sleep tracker. *PLoS ONE, 15*(12), e0243214. https://doi.org/10.1371/journal.pone.0243214
- Rosenbach, H., Itzkovitch, A., Gidron, Y., & Schonberg, T. (2025). Assessing stress level scores against wearables-driven physiological measurements. *Stress and Health, 41*(6), e70125. https://doi.org/10.1002/smi.70125 (abstract and research portal; preprint: https://doi.org/10.1101/2025.01.06.630177)
- Schyvens, A.-M., Van Oost, N. C., Aerts, J.-M., Masci, F., Peters, B., Neven, A., Dirix, H., Wets, G., Ross, V., & Verbraecken, J. (2024). Accuracy of Fitbit Charge 4, Garmin Vivosmart 4, and WHOOP versus polysomnography: Systematic review. *JMIR mHealth and uHealth, 12*, e52192. https://doi.org/10.2196/52192 (abstract)

**Work, students and sleep**

- Australian Bureau of Statistics. (2025, December 12). *Casual work continues to decline* [Media release]. https://www.abs.gov.au/media-centre/media-releases/casual-work-continues-decline
- Chiang, Y. C., Arendt, S., & Sapp, S. (2020). Academic performance, employment, and sleep health: A comparison between working and nonworking students. *International Journal of Higher Education, 9*(3), 202-213. https://doi.org/10.5430/ijhe.v9n3p202 (abstract)
- Feng, T., Booth, B. M., Baldwin-Rodríguez, B., Osorno, F., & Narayanan, S. (2021). A multimodal analysis of physical activity, sleep, and work shift in nurses with wearable sensor data. *Scientific Reports, 11*, 8693. https://doi.org/10.1038/s41598-021-87029-w (abstract)
- Griffin, S., & Crossley, M. (2018, September 10). *Spreading the load to help carry that weight*. UNSW Newsroom (originally in *The Australian*). https://www.unsw.edu.au/newsroom/news/2018/09/spreading-the-load-to-help-carry-that-weight (secondary report of the 2017 Universities Australia Student Finances Survey)
- Hershner, S. D., & Chervin, R. D. (2014). Causes and consequences of sleepiness among college students. *Nature and Science of Sleep, 6*, 73-84. https://doi.org/10.2147/NSS.S62907 (abstract)
- Kecklund, G., & Axelsson, J. (2016). Health consequences of shift work and insufficient sleep. *BMJ, 355*, i5210. https://doi.org/10.1136/bmj.i5210 (abstract via Europe PMC)
- Mbous, Y. P. V., Nili, M., Mohamed, R., & Dwibedi, N. (2022). Psychosocial correlates of insomnia among college students. *Preventing Chronic Disease, 19*, 220060. https://doi.org/10.5888/pcd19.220060
- Schneider, D., & Harknett, K. (2019). Consequences of routine work-schedule instability for worker health and well-being. *American Sociological Review, 84*(1), 82-114. https://doi.org/10.1177/0003122418823184 (figures from the authors' Shift Project research brief: https://shift.hks.harvard.edu/files/2019/01/Consequences-of-Routine-Work-Schedule-Instability-for-Worker-Health-and-Wellbeing.pdf)
- Sonnentag, S., & Fritz, C. (2007). The Recovery Experience Questionnaire: Development and validation of a measure for assessing recuperation and unwinding from work. *Journal of Occupational Health Psychology, 12*(3), 204-221. https://doi.org/10.1037/1076-8998.12.3.204 (abstract)
- Vedaa, Ø., Harris, A., Bjorvatn, B., Waage, S., Sivertsen, B., Tucker, P., & Pallesen, S. (2016). Systematic review of the relationship between quick returns in rotating shift work and health-related outcomes. *Ergonomics, 59*(1), 1-14. https://doi.org/10.1080/00140139.2015.1052020 (author accepted manuscript: https://cronfa.swansea.ac.uk/Record/cronfa22100)

**Personal informatics and reflection**

- Baumer, E. P. S. (2015). Reflective informatics: Conceptual dimensions for designing technologies of reflection. In *Proceedings of CHI 2015* (pp. 585-594). ACM. https://doi.org/10.1145/2702123.2702234 (abstract)
- Baumer, E. P. S., Khovanskaya, V., Matthews, M., Reynolds, L., Schwanda Sosik, V., & Gay, G. (2014). Reviewing reflection: On the use of reflection in interactive system design. In *Proceedings of DIS 2014* (pp. 93-102). ACM. https://doi.org/10.1145/2598510.2598598 (abstract)
- Bentley, F., Tollmar, K., Stephenson, P., Levy, L., Jones, B., Robertson, S., Price, E., Catrambone, R., & Wilson, J. (2013). Health Mashups: Presenting statistical patterns between wellbeing data and context in natural language to promote behavior change. *ACM Transactions on Computer-Human Interaction, 20*(5), Article 30. https://doi.org/10.1145/2503823 (abstract)
- Bentvelzen, M., Woźniak, P. W., Herbes, P. S. F., Stefanidi, E., & Niess, J. (2022). Revisiting reflection in HCI: Four design resources for technologies that support reflection. *Proceedings of the ACM on Interactive, Mobile, Wearable and Ubiquitous Technologies, 6*(1), Article 2. https://doi.org/10.1145/3517233
- Choe, E. K., Lee, B., & schraefel, m. c. (2015). Characterizing visualization insights from quantified selfers' personal data presentations. *IEEE Computer Graphics and Applications, 35*(4), 28-37. https://doi.org/10.1109/MCG.2015.51 (abstract)
- Choe, E. K., Lee, B., Zhu, H., Riche, N. H., & Baur, D. (2017). Understanding self-reflection: How people reflect on personal data through visual data exploration. In *Proceedings of PervasiveHealth 2017* (pp. 173-182). ACM. https://doi.org/10.1145/3154862.3154881 (abstract)
- Choe, E. K., Lee, N. B., Lee, B., Pratt, W., & Kientz, J. A. (2014). Understanding quantified-selfers' practices in collecting and exploring personal data. In *Proceedings of CHI 2014* (pp. 1143-1152). ACM. https://doi.org/10.1145/2556288.2557372
- Ding, X., Wei, S., Gui, X., Gu, N., & Zhang, P. (2021). Data engagement reconsidered: A study of automatic stress tracking technology in use. In *Proceedings of CHI 2021* (pp. 1-13). ACM. https://doi.org/10.1145/3411764.3445763 (abstract)
- Epstein, D. A., Ping, A., Fogarty, J., & Munson, S. A. (2015). A lived informatics model of personal informatics. In *Proceedings of UbiComp 2015* (pp. 731-742). ACM. https://doi.org/10.1145/2750858.2804250
- Fleck, R., & Fitzpatrick, G. (2010). Reflecting on reflection: Framing a design landscape. In *Proceedings of OZCHI 2010* (pp. 216-223). ACM. https://doi.org/10.1145/1952222.1952269 (abstract only; level definitions unverified)
- Gaver, W. W., Beaver, J., & Benford, S. (2003). Ambiguity as a resource for design. In *Proceedings of CHI 2003* (pp. 233-240). ACM. https://doi.org/10.1145/642611.642653 (abstract)
- Kersten-van Dijk, E. T., Westerink, J. H. D. M., Beute, F., & IJsselsteijn, W. A. (2017). Personal informatics, self-insight, and behavior change: A critical review of current literature. *Human-Computer Interaction, 32*(5-6), 268-296. https://doi.org/10.1080/07370024.2016.1276456 (abstract)
- Li, I., Dey, A., & Forlizzi, J. (2010). A stage-based model of personal informatics systems. In *Proceedings of CHI 2010* (pp. 557-566). ACM. https://doi.org/10.1145/1753326.1753409
- Rapp, A., & Cena, F. (2016). Personal informatics for everyday life: How users without prior self-tracking experience engage with personal data. *International Journal of Human-Computer Studies, 94*, 1-17. https://doi.org/10.1016/j.ijhcs.2016.05.006 (abstract)
- Rooksby, J., Rost, M., Morrison, A., & Chalmers, M. (2014). Personal tracking as lived informatics. In *Proceedings of CHI 2014* (pp. 1163-1172). ACM. https://doi.org/10.1145/2556288.2557039 (abstract)

**Visualisation**

- Consolvo, S., McDonald, D. W., Toscos, T., Chen, M. Y., Froehlich, J., Harrison, B., Klasnja, P., LaMarca, A., LeGrand, L., Libby, R., Smith, I., & Landay, J. A. (2008). Activity sensing in the wild: A field trial of UbiFit Garden. In *Proceedings of CHI 2008* (pp. 1797-1806). ACM. https://doi.org/10.1145/1357054.1357335
- Epstein, D., Cordeiro, F., Bales, E., Fogarty, J., & Munson, S. (2014). Taming data complexity in lifelogs: Exploring visual cuts of personal informatics data. In *Proceedings of DIS 2014* (pp. 667-676). ACM. https://doi.org/10.1145/2598510.2598558
- Gouveia, R., Pereira, F., Karapanos, E., Munson, S. A., & Hassenzahl, M. (2016). Exploring the design space of glanceable feedback for physical activity trackers. In *Proceedings of UbiComp 2016* (pp. 144-155). ACM. https://doi.org/10.1145/2971648.2971754 (abstract)
- Huang, D., Tory, M., Aseniero, B. A., Bartram, L., Bateman, S., Carpendale, S., Tang, A., & Woodbury, R. (2015). Personal visualization and personal visual analytics. *IEEE Transactions on Visualization and Computer Graphics, 21*(3), 420-433. https://doi.org/10.1109/TVCG.2014.2359887 (abstract)
- Huang, D., Tory, M., & Bartram, L. (2016). A field study of on-calendar visualizations. In *Proceedings of Graphics Interface 2016* (pp. 13-20). https://doi.org/10.20380/GI2016.03 (full text: https://arxiv.org/abs/1706.01123)
- Jansen, Y., Dragicevic, P., Isenberg, P., Alexander, J., Karnik, A., Kildal, J., Subramanian, S., & Hornbæk, K. (2015). Opportunities and challenges for data physicalization. In *Proceedings of CHI 2015* (pp. 3227-3236). ACM. https://doi.org/10.1145/2702123.2702180 (abstract)
- Kay, M., Kola, T., Hullman, J. R., & Munson, S. A. (2016). When (ish) is my bus? User-centered visualizations of uncertainty in everyday, mobile predictive systems. In *Proceedings of CHI 2016* (pp. 5092-5103). ACM. https://doi.org/10.1145/2858036.2858558 (abstract)
- Munzner, T. (n.d.). *Visualization Analysis and Design: Rules of thumb* [Lecture slides based on Munzner, T. (2014), *Visualization Analysis and Design*, CRC Press]. https://cs.ubc.ca/~tmm/talks/vad/VAD-rules.pdf (slides opened; book not accessed)
- Pousman, Z., Stasko, J., & Mateas, M. (2007). Casual information visualization: Depictions of data in everyday life. *IEEE Transactions on Visualization and Computer Graphics, 13*(6), 1145-1152. https://doi.org/10.1109/TVCG.2007.70541
- Song, H., & Szafir, D. A. (2019). Where's my data? Evaluating visualizations with missing data. *IEEE Transactions on Visualization and Computer Graphics, 25*(1), 914-924. https://doi.org/10.1109/TVCG.2018.2864914
- Thudt, A., Hinrichs, U., Huron, S., & Carpendale, S. (2018). Self-reflection and personal physicalization construction. In *Proceedings of CHI 2018*. ACM. https://doi.org/10.1145/3173574.3173728 (abstract)
- van Wijk, J. J., & van Selow, E. R. (1999). Cluster and calendar based visualization of time series data. In *Proceedings of IEEE InfoVis 1999* (pp. 4-9). https://doi.org/10.1109/INFVIS.1999.801851 (abstract)

**Composite views, comparison, 3D and encoding (Section 4b)**

- Borgo, R., Kehrer, J., Chung, D. H. S., Maguire, E., Laramee, R. S., Hauser, H., Ward, M., & Chen, M. (2013). Glyph-based visualization: Foundations, design guidelines, techniques and applications. In *Eurographics 2013 State of the Art Reports* (pp. 39-63). https://doi.org/10.2312/conf/EG2013/stars/039-063 (abstract)
- Brath, R. (2014). 3D InfoVis is here to stay: Deal with it. In *2014 IEEE VIS International Workshop on 3DVis* (pp. 25-31). https://doi.org/10.1109/3DVis.2014.7160096 (abstract)
- Choe, E. K., Lee, B., Kay, M., Pratt, W., & Kientz, J. A. (2015). SleepTight: Low-burden, self-monitoring technology for capturing and reflecting on sleep behaviors. In *Proceedings of UbiComp 2015* (pp. 121-132). ACM. https://doi.org/10.1145/2750858.2804266 (abstract)
- Cockburn, A., & McKenzie, B. (2002). Evaluating the effectiveness of spatial memory in 2D and 3D physical and virtual environments. In *Proceedings of CHI 2002* (pp. 203-210). ACM. https://doi.org/10.1145/503376.503413 (abstract)
- Deng, D., Cui, W., Meng, X., Xu, M., Liao, Y., Zhang, H., & Wu, Y. (2022). Revisiting the design patterns of composite visualizations. arXiv:2203.10476. https://arxiv.org/abs/2203.10476 (full text opened)
- Elmqvist, N., & Tsigas, P. (2008). A taxonomy of 3D occlusion management for visualization. *IEEE Transactions on Visualization and Computer Graphics, 14*(5), 1095-1109. https://doi.org/10.1109/TVCG.2008.59 (abstract; pattern names from the authors' slides: https://www.cse.chalmers.se/~tsigas/papers/SLIDES/Taxonomy-3d-Occlusion.pdf)
- Gleicher, M. (2018). Considerations for visualizing comparison. *IEEE Transactions on Visualization and Computer Graphics, 24*(1), 413-423. https://doi.org/10.1109/TVCG.2017.2744199 (preprint: https://par.nsf.gov/servlets/purl/10062070)
- Gleicher, M., Albers, D., Walker, R., Jusufi, I., Hansen, C. D., & Roberts, J. C. (2011). Visual comparison for information visualization. *Information Visualization, 10*(4), 289-309. https://doi.org/10.1177/1473871611416549 (abstract)
- Harrower, M., & Brewer, C. A. (2003). ColorBrewer.org: An online tool for selecting colour schemes for maps. *The Cartographic Journal, 40*(1), 27-37. https://doi.org/10.1179/000870403235002042 (abstract)
- Javed, W., & Elmqvist, N. (2012). Exploring the design space of composite visualization. In *Proceedings of IEEE Pacific Visualization Symposium 2012* (pp. 1-8). https://doi.org/10.1109/PacificVis.2012.6183556 (abstract; pattern descriptions via Deng et al. 2022 and Gleicher 2018)
- Jones, S. L., & Kelly, R. (2017). Dealing with information overload in multifaceted personal informatics systems. *Human-Computer Interaction, 33*(1), 1-48. https://doi.org/10.1080/07370024.2017.1302334 (abstract)
- Kraus, M., Angerbauer, K., Buchmüller, J., Schweitzer, D., Keim, D. A., Sedlmair, M., & Fuchs, J. (2020). Assessing 2D and 3D heatmaps for comparative analysis: An empirical study. In *Proceedings of CHI 2020* (pp. 1-14). ACM. https://doi.org/10.1145/3313831.3376675 (abstract)
- Smart, S., & Szafir, D. A. (2019). Measuring the separability of shape, size, and color in scatterplots. In *Proceedings of CHI 2019* (pp. 1-14). ACM. https://doi.org/10.1145/3290605.3300899 (abstract)
- Zacks, J., Levy, E., Tversky, B., & Schiano, D. J. (1998). Reading bar graphs: Effects of extraneous depth cues and graphical context. *Journal of Experimental Psychology: Applied, 4*(2), 119-138. https://doi.org/10.1037/1076-898X.4.2.119 (abstract)

**Risks, workplace and privacy**

- Ajunwa, I., Crawford, K., & Schultz, J. (2017). Limitless worker surveillance. *California Law Review, 105*(3), 735. SSRN: https://ssrn.com/abstract=2746211 (abstract via Microsoft Research page; US legal context)
- Baron, K. G., Abbott, S., Jao, N., Manalo, N., & Mullen, R. (2017). Orthosomnia: Are some patients taking the quantified self too far? *Journal of Clinical Sleep Medicine, 13*(2), 351-354. https://doi.org/10.5664/jcsm.6472
- Chung, C.-F., Gorm, N., Shklovski, I., & Munson, S. A. (2017). Finding the right fit: Understanding health tracking in workplace wellness programs. In *Proceedings of CHI 2017* (pp. 4875-4886). ACM. https://doi.org/10.1145/3025453.3025510 (abstract)
- Etkin, J. (2016). The hidden cost of personal quantification. *Journal of Consumer Research, 42*(6), 967-984. https://doi.org/10.1093/jcr/ucv095 (abstract)
- Gorm, N., & Shklovski, I. (2016). Steps, choices and moral accounting: Observations from a step-counting campaign in the workplace. In *Proceedings of CSCW 2016* (pp. 148-159). ACM. https://doi.org/10.1145/2818048.2819944 (abstract)
- Mettler, T., & Wulf, J. (2019). Physiolytics at the workplace: Affordances and constraints of wearables use from an employee's perspective. *Information Systems Journal, 29*(1), 245-273. https://doi.org/10.1111/isj.12205 (abstract)
- Office of the Australian Information Commissioner. (n.d.). *Employee records exemption*. https://oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/employee-records-exemption
- Ravichandran, R., Sien, S.-W., Patel, S. N., Kientz, J. A., & Pina, L. R. (2017). Making sense of sleep sensors: How sleep sensing technologies support and undermine sleep health. In *Proceedings of CHI 2017* (pp. 6864-6875). ACM. https://doi.org/10.1145/3025453.3025557

**Not verified or not found**

- A peer-reviewed validation of Garmin Body Battery as a composite score: none found.
- An independent validation of Garmin wrist respiration rate: none found.
- Whether a Connect IQ device app on fēnix 8 can read the sleep score complication: not confirmed.
- Fleck & Fitzpatrick's exact R0 to R4 definitions: taken from secondary summaries, not the original text.
- The 2017 Universities Australia survey figures: from a university news summary, not the primary report.
- Javed & Elmqvist (2012) pattern definitions: from secondary descriptions, not the original full text.
- Brath (2014) "3D InfoVis is here to stay": abstract only.
- Any published evaluation of calendar heatmaps for sleep or body data, or of shift workers reading biometric overlays on a roster: none found.
- Lighting or glow as a reliable carrier of ordinal levels in 3D: no evidence found; treated as unsuitable.
- Red/green colour-vision deficiency as a reason to avoid red/green: commonly stated, but no source opened in this research.
