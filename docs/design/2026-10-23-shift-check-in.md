# Design rationale: "How was the work?" after a shift, and the body band

Offshift, DECO2850, 23 October 2026. This document explains two new features, the post-shift check-in (sections 1 to 5) and the body band on the calendar floor (section 6), and why they are designed the way they are. Every design decision below is tied to published research. The full evidence is in two research briefs in this repository:

- [Post-shift difficulty rating](../research/2026-10-23-post-shift-difficulty.md) (48 references, each marked by how far it was checked)
- [Biometrics on the calendar](../research/2026-10-23-biometrics-on-the-calendar.md) (about 75 references)

Every DOI cited here was checked against Crossref or doi.org on 23 October 2026.

## 1. The feature

When a rostered shift finishes, the worker's Garmin watch asks once: **How was the work?** The worker presses one of four work words, **Light, Steady, Busy, Hard**, or **Skip**. The answer colours that shift on the 3D week from pale to dark violet, and the word is printed on the block. Nothing goes to the manager.

## 2. Why build it

**The problem it serves.** Offshift exists for one moment: a manager asks "can you cover Friday close?" and the worker decides. Our interviews (P1 to P5) showed workers decide alone, under guilt and pressure (P2, P4). *(Corrected 25 Oct: the interview record supports guilt and pressure, not memory.)* A record of how past shifts actually went gives them something firmer to stand on, without Offshift deciding for them.

**Evidence that work demands matter for this group.**

- Unstable and unpredictable schedules harm sleep and wellbeing more than low wages do, in a study of 27,792 retail and food-service workers (Schneider & Harknett, 2019).
- Late closes followed by early opens ("quick returns") shorten the next sleep and raise fatigue in the short term (Vedaa et al., 2016).
- Recovery is hardest exactly when work demands are high, which Sonnentag (2018) calls the recovery paradox. Knowing which shifts are demanding is the first step to protecting recovery after them (Sonnentag & Fritz, 2007).
- Workers given their own work data used it to plan healthier weeks and to confirm suspicions such as "this isn't my imagination" (Zhang et al., 2023).

## 3. Design process

This is a design computing project, so the process matters as much as the result.

1. **Requirement from the team.** A post-shift prompt on the watch, work context, low to hard, colouring the calendar.
2. **Audit of what existed.** Offshift already let workers rate a shift Fine, Tired or Wiped, but only on the calendar, and those are body words.
3. **Literature review.** I commissioned two research briefs: one on watch self-report, single-item workload scales and colour for ordered data; one on biometrics and showing body data on a calendar.
4. **Verification.** Each brief marks every source as full text, abstract or secondary. I then checked all 42 DOIs in the first brief, and six key DOIs in the second, against Crossref and doi.org. I re-ran the colour-blind contrast script myself ([`2026-10-23-difficulty-ramp-check.py`](../research/2026-10-23-difficulty-ramp-check.py)), and it reproduced the brief's numbers.
5. **Decisions.** The decisions below each cite the evidence that drove them, and say where the evidence was weak and the choice is ours.
6. **Test-driven build.** Failing tests first, then the code, with both commits recorded as evidence (see the commit log for this branch).
7. **Questions to test with workers.** Section 7 lists what the research could not settle.

## 4. Design decisions

### 4.1 Ask on the watch, once, with one press

| Decision | Why |
| --- | --- |
| One question, one press | Single-question watch prompts ("microinteraction EMA") get better response than phone surveys, even with about 8 times more interruptions (Intille et al., 2016). Answers take about 5 seconds (Ponnada et al., 2021, 2022). |
| Ask once, never again for that shift | Repeating the same kind of answer is the main burden people report, more than how often they are asked (Le et al., 2025). The 12-month TIME study never re-asked a missed prompt (Ponnada et al., 2022). |
| Always offer Skip | A skip is recorded as "Skipped", never as a low value, so a skipped shift never looks like a Light one (Li, Dey & Forlizzi, 2010, name sparse data as a barrier to reflection). |
| A missed or skipped shift can still be rated on the calendar | The calendar is the "later". No snooze: a snooze is a second interruption about the same shift. |

### 4.2 Ask about 15 minutes after the rostered end

Notifications feel most disruptive while someone is finishing a task, and least when they are idle or starting something new (Mehrotra et al., 2016). Workload ratings are meant to be given immediately after the task (Hart, 2006), because remembered ratings drift to the worst moment and the last few minutes (Redelmeier & Kahneman, 1996). The worker is still counting the till at the rostered end, so we ask about 15 minutes later, on the way home. **The 15 minutes is our proposal, not a published figure.**

The watch's background check already runs every 5 minutes, and Connect IQ allows only one such timer, so the check-in rides on the existing check. The prompt can arrive up to 5 minutes later than planned. After 12 hours the prompt is dropped and the shift stays rateable on the calendar.

### 4.3 Four work words: Light, Steady, Busy, Hard

| Decision | Why |
| --- | --- |
| A single item | A single workload item meets validity criteria on its own (Gilbert & Kelloway, 2014), and single items correlate well with long scales (Wanous, Reichers & Hudy, 1997). Patterns come from many ratings over weeks, not from one precise rating. |
| Four points | Longer scales measure better (Preston & Colman, 2000), but a watch realistically holds fewer than five options without scrolling (Le et al., 2025; Ponnada et al., 2022). Four is a compromise for the screen, not an ideal. Four also differs from the three body words, which keeps the two ratings apart. |
| Every point is a word, no numbers | Labelling every point with words raises reliability and spares people from turning numbers into meanings (Krosnick & Presser, 2010). |
| Work words, not body or mood words | A single "how stressful" item pulls in the person's own wellbeing (Houdmont et al., 2019), and NASA-TLX keeps frustration separate from demand (Hart, 2006). "Light" and "Hard" are anchor words from Borg's exertion scale, built to understand people at work (Borg, 1982). |
| Kept separate from Fine / Tired / Wiped | One rates the shift's demands, the other the worker's body. Merging them, or inferring one from the other, would drift towards health judgements, which Offshift does not make. Both stay. |

Each word has a short meaning under it on the watch: Light, *less than usual*; Steady, *a normal shift*; Busy, *fast, lots to do*; Hard, *asked a lot of you*. This answers the brief's caution that "Busy" leans to pace and "Hard" to effort, by making the four words read as one ladder.

### 4.4 Colour: a violet ramp, darker means harder, never colour alone

| Decision | Why |
| --- | --- |
| A sequential ramp in one hue, evenly darker | Ordered data needs a sequential scheme (Harrower & Brewer, 2003), and lightness should change evenly in one direction (Crameri, Shephard & Heron, 2020). |
| Darker means harder | People read darker as more, and on a light background this agrees with their expectations (Schloss et al., 2019, reported in Sibrel et al., 2020). Offshift's ground is cream. |
| Violet: Light `#E5D8F0`, Steady `#C3ABD2`, Busy `#A382B3`, Hard `#805C8C` | No red, amber or green, which carry traffic-light judgement and fail for colour-blind readers (Crameri et al., 2020). Amber and coral already mean warning and problem in Offshift. Adjacent steps stay about 11 to 15 apart in CIEDE2000 for typical vision and simulated protan, deutan and tritan vision (Machado, Oliveira & Fernandes, 2009). |
| The word on the block, plus a legend | Colour must never be the only way information is shown (W3C, WCAG 2.2, 1.4.1). |
| Height still means duration | Block height already shows how long the shift is. Difficulty never changes size. |
| Unrated or skipped shifts keep their workplace colour | A missing rating must never look like an easy shift. |

**Where we went against the research, and why.** The brief recommends keeping workplace colours in the normal week and showing the difficulty ramp only in a separate "How shifts went" view, because under red-green colour blindness the palest violet sits close to the light-blue class blocks. The team asked for the shifts themselves to change colour, so rated shifts take the ramp in the main week. We reduce the risk by printing the word on every rated block and showing a legend. A dedicated view is listed as a follow-up.

### 4.5 Private by default

Workplace tracking raises surveillance worries (Chung et al., 2017), and tracked numbers at work become "socially negotiated" (Gorm & Shklovski, 2016). The rating stays with the worker. The team view (`/api/team`) never includes shifts or ratings, and a test guards it, like the existing privacy-boundary tests for body readings.

## 5. What reflection this supports

Li, Dey and Forlizzi (2010) separate short-term reflection, noticing right after recording, from long-term reflection, comparing across weeks. The block changing colour that evening supports the first. A week of coloured blocks, and later several weeks side by side, supports the second: "Friday closes are always dark." The calendar view is the classic way to make weekly patterns visible "almost effortlessly" (van Wijk & van Selow, 1999). Offshift shows the pattern and never names a cause or gives advice: reflection is not automatic, and systems should invite it rather than prescribe (Baumer, 2015).

## 6. Body data on the calendar

> **Superseded on 25 October 2026.** After the tutor's feedback the watch reads heart rate and stress only during each shift, in 15-minute blocks, and the calendar draws them down the shift instead of along the floor of each day. Body Battery and the overnight bridge are gone. The colour, hatching and one-signal decisions below still apply. See [2026-10-25-biometrics-during-shifts.md](2026-10-25-biometrics-during-shifts.md).

The second brief asked how the watch's readings could sit on the same 3D week without competing with the work colours. This was built on 23 October.

| Decision | Why |
| --- | --- |
| On the calendar itself, not a separate screen | On a calendar overlay, moments where people could not explain their data fell from 29 to 8 (Huang, Tory & Bartram, 2016). Personal data means most next to the life events that explain it (Li, Dey & Forlizzi, 2010). |
| Day by day, side by side, not on the hours | The watch gives one level per signal per day, so laying it along the time-of-day axis would claim a precision it doesn't have. Day-level placement next to each day is the juxtaposition pattern for comparing two kinds of data (Gleicher et al., 2011; Javed & Elmqvist, 2012). |
| A flat strip along the floor, in front of each day | Height already means duration, perspective distorts size and height, and nearby bars bias judgements of height (Munzner, 2014, rules of thumb; Zacks et al., 1998). Hue is taken by the shift difficulty. A flat region of the floor in front of the tile stays clear of the blocks from the usual angle and from above. |
| One neutral grey, four even steps: `#E2E2DE`, `#B9BAB4`, `#8E908A`, `#62645F` | A sequential ramp for ordered levels (Harrower & Brewer, 2003), evenly darker (Crameri et al., 2020). Grey has no hue, so it reads the same with colour-blind vision and never looks like a violet shift. Adjacent steps stay 9.8 to 17.4 apart in CIEDE2000 for typical, protan, deutan and tritan vision (Machado et al., 2009), checked with the same script. An ink outline separates the palest step from the cream ground. |
| Darker means more of what the label names | People read darker as more (Schloss et al., 2019, via Sibrel et al., 2020). So the band reads "more energy", "more stress" or "heart further above your usual", and the legend says which. No red or green, and no good or bad: ranges against the worker's own usual, never verdicts (Ravichandran et al., 2017; Consolvo et al., 2008). |
| No reading is hatched, never the palest step; a stale reading is hatched over its tone | Missing data must look missing, not low (Song & Szafir, 2019). Today's reading older than 12 hours is shown but marked, matching the Body card. |
| Last night's recharge bridges the gap between two days | Sleep belongs between days. Showing it as a bridge makes the sequence "shift ends, the night after, the next day" visible, which is where late closes and quick returns cost sleep (Vedaa et al., 2016; Schneider & Harknett, 2019). |
| The worker picks one signal: Energy, Stress or Heart | Showing everything overwhelms (Jones & Kelly, 2018). Pulse ox and breathing are left out: they are single moments, and Garmin's pulse ox gave a reading in only 59% of attempts in a validation study (Carrier et al., 2025). |
| "Read flat" looks straight down | 2D beats 3D for reading and comparing values (Kraus et al., 2020; Munzner, 2014). From above the floor strips become a plain row, hours (which have no height from above) are hidden, and the day's name moves clear of the band. This is our proposal from the evidence, not a tested design. |
| Keys under the week, never over it | A key on top hid the Monday to Thursday tiles on a laptop-sized window, so both keys sit below the 3D view. |
| Private, and forgotten when sharing stops | The server keeps the latest reading of each day for 28 days, only while sharing is on. Turning sharing off on the watch clears every day, and the team view never sees them, like the existing body-reading rules. |

## 7. Open questions to test with workers

1. Do Light, Steady, Busy and Hard read as one ladder? Card-sort with P1 to P5, with "Quiet" and "Flat out" as alternatives.
2. Is 15 minutes after the end the right moment? Compare 5, 15 and 30.
3. Is a toast ("Saved: Busy. Change it on your calendar.") enough as undo, or do workers want a confirm screen?
4. Does the violet read as "harder" without the legend? Include a colour-blind check of the rendered 3D view.
5. Does seeing past ratings help when a new ask arrives, or does it feel like pressure?
6. Do workers feel the body rating and the work rating ask the same thing twice?
7. Does the floor band get noticed from the usual angle, or only in Read flat? Do workers read "darker = more stress" without the key?
8. Which signal do workers choose for the band, and does anyone want two at once?

## References

Baumer, E. P. S. (2015). Reflective informatics: Conceptual dimensions for designing technologies of reflection. *Proc. CHI 2015*, 585-594. https://doi.org/10.1145/2702123.2702234

Borg, G. A. (1982). Psychophysical bases of perceived exertion. *Medicine & Science in Sports & Exercise, 14*(5), 377-381. https://doi.org/10.1249/00005768-198205000-00012

Carrier, B., Marten Chaves, S., & Navalta, J. W. (2025). Validation of aerobic capacity (VO2max) and pulse oximetry in wearable technology. *Sensors, 25*(1), 275. https://doi.org/10.3390/s25010275

Chung, C.-F., Gorm, N., Shklovski, I. A., & Munson, S. (2017). Finding the right fit: Understanding health tracking in workplace wellness programs. *Proc. CHI 2017*, 4875-4886. https://doi.org/10.1145/3025453.3025510

Consolvo, S., McDonald, D. W., Toscos, T., Chen, M. Y., Froehlich, J., Harrison, B., Klasnja, P., LaMarca, A., LeGrand, L., Libby, R., Smith, I., & Landay, J. A. (2008). Activity sensing in the wild: A field trial of UbiFit Garden. *Proc. CHI 2008*, 1797-1806. https://doi.org/10.1145/1357054.1357335

Crameri, F., Shephard, G. E., & Heron, P. J. (2020). The misuse of colour in science communication. *Nature Communications, 11*, 5444. https://doi.org/10.1038/s41467-020-19160-7

Gilbert, S., & Kelloway, E. K. (2014). Using single items to measure job stressors. *International Journal of Workplace Health Management, 7*(3), 186-199. https://doi.org/10.1108/IJWHM-03-2013-0011

Gleicher, M., Albers, D., Walker, R., Jusufi, I., Hansen, C. D., & Roberts, J. C. (2011). Visual comparison for information visualization. *Information Visualization, 10*(4), 289-309. https://doi.org/10.1177/1473871611416549

Gorm, N., & Shklovski, I. (2016). Steps, choices and moral accounting: Observations from a step-counting campaign in the workplace. *Proc. CSCW 2016*, 148-159. https://doi.org/10.1145/2818048.2819944

Harrower, M., & Brewer, C. A. (2003). ColorBrewer.org: An online tool for selecting colour schemes for maps. *The Cartographic Journal, 40*(1), 27-37. https://doi.org/10.1179/000870403235002042

Hart, S. G. (2006). NASA-Task Load Index (NASA-TLX); 20 years later. *Proc. Human Factors and Ergonomics Society Annual Meeting, 50*(9), 904-908. https://doi.org/10.1177/154193120605000909

Houdmont, J., Jachens, L., Randall, R., Hopson, S., Nuttall, S., & Pamia, S. (2019). What does a single-item measure of job stressfulness assess? *International Journal of Environmental Research and Public Health, 16*(9), 1480. https://doi.org/10.3390/ijerph16091480

Huang, D., Tory, M., & Bartram, L. (2016). A field study of on-calendar visualizations. *Proc. Graphics Interface 2016*, 13-20. https://doi.org/10.20380/GI2016.03

Intille, S., Haynes, C., Maniar, D., Ponnada, A., & Manjourides, J. (2016). µEMA: Microinteraction-based ecological momentary assessment (EMA) using a smartwatch. *Proc. UbiComp 2016*, 1124-1128. https://doi.org/10.1145/2971648.2971717

Javed, W., & Elmqvist, N. (2012). Exploring the design space of composite visualization. *Proc. IEEE PacificVis 2012*, 1-8. https://doi.org/10.1109/PacificVis.2012.6183556

Jones, S. L., & Kelly, R. (2018). Dealing with information overload in multifaceted personal informatics systems. *Human-Computer Interaction, 33*(1), 1-48. https://doi.org/10.1080/07370024.2017.1302334

Kraus, M., Angerbauer, K., Buchmüller, J., Schweitzer, D., Keim, D. A., Sedlmair, M., & Fuchs, J. (2020). Assessing 2D and 3D heatmaps for comparative analysis: An empirical study. *Proc. CHI 2020*, 1-14. https://doi.org/10.1145/3313831.3376675

Krosnick, J. A., & Presser, S. (2010). Question and questionnaire design. In P. V. Marsden & J. D. Wright (Eds.), *Handbook of Survey Research* (2nd ed., pp. 263-313). Emerald.

Le, H., Potter, V., Lakshminarayanan, R., Mishra, V., & Intille, S. (2025). Feasibility and utility of multimodal micro ecological momentary assessment on a smartwatch. *Proc. CHI 2025*. https://doi.org/10.1145/3706598.3714086

Li, I., Dey, A., & Forlizzi, J. (2010). A stage-based model of personal informatics systems. *Proc. CHI 2010*, 557-566. https://doi.org/10.1145/1753326.1753409

Machado, G. M., Oliveira, M. M., & Fernandes, L. A. F. (2009). A physiologically-based model for simulation of color vision deficiency. *IEEE Transactions on Visualization and Computer Graphics, 15*(6), 1291-1298. https://doi.org/10.1109/TVCG.2009.113

Mehrotra, A., Pejovic, V., Vermeulen, J., Hendley, R., & Musolesi, M. (2016). My phone and me: Understanding people's receptivity to mobile notifications. *Proc. CHI 2016*, 1021-1032. https://doi.org/10.1145/2858036.2858566

Munzner, T. (2014). *Visualization Analysis and Design*. CRC Press. Rules of thumb as summarised in the author's slides: https://cs.ubc.ca/~tmm/talks/vad/VAD-rules.pdf

Ponnada, A., Thapa-Chhetry, B., Manjourides, J., & Intille, S. (2021). Measuring criterion validity of microinteraction ecological momentary assessment (micro-EMA). *JMIR mHealth and uHealth, 9*(3), e23391. https://doi.org/10.2196/23391

Ponnada, A., Wang, S., Chu, D., Do, B., Dunton, G., & Intille, S. (2022). Intensive longitudinal data collection using microinteraction ecological momentary assessment. *JMIR Formative Research, 6*(2), e32772. https://doi.org/10.2196/32772

Preston, C. C., & Colman, A. M. (2000). Optimal number of response categories in rating scales. *Acta Psychologica, 104*(1), 1-15. https://doi.org/10.1016/S0001-6918(99)00050-5

Ravichandran, R., Sien, S.-W., Patel, S. N., Kientz, J. A., & Pina, L. R. (2017). Making sense of sleep sensors: How sleep sensing technologies support and undermine sleep health. *Proc. CHI 2017*, 6864-6875. https://doi.org/10.1145/3025453.3025557

Redelmeier, D. A., & Kahneman, D. (1996). Patients' memories of painful medical treatments: Real-time and retrospective evaluations of two minimally invasive procedures. *Pain, 66*(1), 3-8. https://doi.org/10.1016/0304-3959(96)02994-6

Schneider, D., & Harknett, K. (2019). Consequences of routine work-schedule instability for worker health and well-being. *American Sociological Review, 84*(1), 82-114. https://doi.org/10.1177/0003122418823184

Song, H., & Szafir, D. A. (2019). Where's my data? Evaluating visualizations with missing data. *IEEE Transactions on Visualization and Computer Graphics, 25*(1), 914-924. https://doi.org/10.1109/TVCG.2018.2864914

Sonnentag, S. (2018). The recovery paradox. *Research in Organizational Behavior, 38*, 169-185. https://doi.org/10.1016/j.riob.2018.11.002

Sonnentag, S., & Fritz, C. (2007). The Recovery Experience Questionnaire. *Journal of Occupational Health Psychology, 12*(3), 204-221. https://doi.org/10.1037/1076-8998.12.3.204

van Wijk, J. J., & van Selow, E. R. (1999). Cluster and calendar based visualization of time series data. *Proc. IEEE InfoVis '99*, 4-9. https://doi.org/10.1109/INFVIS.1999.801851

Vedaa, Ø., Harris, A., Bjorvatn, B., Waage, S., Sivertsen, B., Tucker, P., & Pallesen, S. (2016). Systematic review of the relationship between quick returns in rotating shift work and health-related outcomes. *Ergonomics, 59*(1), 1-14. https://doi.org/10.1080/00140139.2015.1052020

W3C. (2023). *Understanding WCAG 2.2: Success Criterion 1.4.1 Use of Color*. https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html

Wanous, J. P., Reichers, A. E., & Hudy, M. J. (1997). Overall job satisfaction: How good are single-item measures? *Journal of Applied Psychology, 82*(2), 247-252. https://doi.org/10.1037/0021-9010.82.2.247

Zacks, J., Levy, E., Tversky, B., & Schiano, D. J. (1998). Reading bar graphs: Effects of extraneous depth cues and graphical context. *Journal of Experimental Psychology: Applied, 4*(2), 119-138. https://doi.org/10.1037/1076-898X.4.2.119

Zhang, A., Boltz, A., Lynn, J., Wang, C.-W., & Lee, M. K. (2023). Stakeholder-centered AI design: Co-designing worker tools with gig workers through data probes. *Proc. CHI 2023*, 1-19. https://doi.org/10.1145/3544548.3581354

Sibrel, S. C., Rathore, R., Lessard, L., & Schloss, K. B. (2020) and Schloss et al. (2019) are cited through the research brief, which read Schloss et al. only as reported by Sibrel et al. See the brief for those entries.
