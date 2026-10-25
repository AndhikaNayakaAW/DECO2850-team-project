# Reading list, by feature

Offshift, DECO2850, 25 October 2026. This list gathers the sources behind each part of Offshift, with links.

How the links were checked on 25 October:

- **[V]**: the page was opened and its content matched.
- **[D]**: the DOI resolves at doi.org to the publisher and its metadata matches, but the publisher blocked automated reading.

"New" marks sources that aren't in the two 23 October briefs ([post-shift difficulty](2026-10-23-post-shift-difficulty.md), [biometrics on the calendar](2026-10-23-biometrics-on-the-calendar.md)).

## 1. The 3D week calendar

| Source | Why it matters | Check |
| --- | --- | --- |
| van Wijk & van Selow (1999). Cluster and calendar based visualization of time series data. *IEEE InfoVis*, 4–9. https://doi.org/10.1109/INFVIS.1999.801851 | The original calendar view: weekly rhythms and unusual days show at a glance | D |
| Munzner (2014). *Visualization Analysis and Design*. CRC Press. https://doi.org/10.1201/b17511 · rules of thumb: https://www.cs.ubc.ca/~tmm/talks/vad/VAD-rules.pdf | "No unjustified 3D": depth is a weak channel. Why values are read in 2D | V |
| Kraus et al. (2020). Assessing 2D and 3D heatmaps for comparative analysis. *CHI 2020*. https://doi.org/10.1145/3313831.3376675 | 3D height helps with single values; 2D is better for overview and comparison | D |
| Bach et al. (2017). A descriptive framework for temporal data visualizations based on generalized space-time cubes. *Computer Graphics Forum, 36*(6), 36–61. https://doi.org/10.1111/cgf.12804 (new) | Words for the 3D week as a space-time cube, and for flattening it into 2D | D |
| Crameri, Shephard & Heron (2020). The misuse of colour in science communication. *Nature Communications, 11*, 5444. https://doi.org/10.1038/s41467-020-19160-7 | Even, one-direction ramps; no rainbow; no red against green. Covers the violet and grey ramps | V |
| Song & Szafir (2019). Where's my data? Evaluating visualizations with missing data. *IEEE TVCG, 25*(1). https://doi.org/10.1109/TVCG.2018.2864914 | Missing data must look missing: the hatched cells | D |

## 2. The one-question prompt after a shift

| Source | Why it matters | Check |
| --- | --- | --- |
| Intille et al. (2016). μEMA: Microinteraction-based ecological momentary assessment using a smartwatch. *UbiComp '16*. https://doi.org/10.1145/2971648.2971717 | One glance, one tap on the watch got better response than phone surveys | D |
| Ponnada et al. (2022). Intensive longitudinal data collection using microinteraction EMA. *JMIR Formative Research, 6*(2), e32772. https://doi.org/10.2196/32772 · open: https://pmc.ncbi.nlm.nih.gov/articles/PMC8867293/ | A 12-month study: answers took about 5 s, fit one screen, and a missed prompt was never re-asked | D / V |
| Le et al. (2025). Feasibility and utility of multimodal micro-EMA on a smartwatch. *CHI 2025*. https://doi.org/10.1145/3706598.3714086 · open: https://pmc.ncbi.nlm.nih.gov/articles/PMC12718675/ | Fewer than five answers fit a watch; repeating the same kind of answer is the main burden | D / V |
| Eisele et al. (2022). The effects of sampling frequency and questionnaire length on perceived burden. *Assessment, 29*(2), 136–151. https://doi.org/10.1177/1073191120957102 | Longer questionnaires, not more frequent ones, raise burden: keep it to one question | D |
| Gilbert & Kelloway (2014). Using single items to measure job stressors. *Int. J. Workplace Health Management, 7*(3). https://doi.org/10.1108/IJWHM-03-2013-0011 | A single workload question is valid | D |
| Krosnick & Presser (2010). Question and questionnaire design. *Handbook of Survey Research*. https://web.stanford.edu/dept/communication/faculty/krosnick/docs/2010/2010%20Handbook%20of%20Survey%20Research.pdf | A word on every point, no numbers: Light, Steady, Busy, Hard | V |

## 3. Heart rate and stress during a shift, on the calendar

| Source | Why it matters | Check |
| --- | --- | --- |
| Huang, Tory & Bartram (2016). A field study of on-calendar visualizations. *Graphics Interface 2016*. https://doi.org/10.20380/GI2016.03 · open: https://arxiv.org/abs/1706.01123 | Fitbit data drawn on people's own calendars: "can't explain this" moments fell from 29 to 8 | D / V |
| Li, Dey & Forlizzi (2010). A stage-based model of personal informatics systems. *CHI 2010*. https://doi.org/10.1145/1753326.1753409 | Lack of context is a barrier to reflection; the shift itself is the context | D |
| McDuff et al. (2012). AffectAura: An intelligent system for emotional memory. *CHI 2012*. https://doi.org/10.1145/2207676.2208525 (new) | Sensed arousal on a timeline beside work events helped people reason about their day | D |
| Kocielnik et al. (2013). Smart technologies for long-term stress monitoring at work. *IEEE CBMS 2013*. https://doi.org/10.1109/CBMS.2013.6627764 (new) | Measured stress shown against work activities made patterns meaningful | D |
| Sanches et al. (2010). Mind the body! Designing a mobile stress management application encouraging personal reflection. *DIS 2010*. https://doi.org/10.1145/1858171.1858182 (new) | Don't diagnose: mirror stress reactions back and let the person interpret them | D |
| Ding et al. (2021). Data engagement reconsidered: A study of automatic stress tracking technology in use. *CHI 2021*. https://doi.org/10.1145/3411764.3445763 | Users of stress trackers lacked context and the knowledge to read the numbers | D |

## 4. Using past shifts to decide on a new ask

| Source | Why it matters | Check |
| --- | --- | --- |
| Zhang et al. (2023). Stakeholder-centered AI design: Co-designing worker tools with gig workers through data probes. *CHI 2023*. https://doi.org/10.1145/3544548.3581354 | Workers used their own work data to recall shifts, weigh trade-offs and confirm suspicions | D |
| Epstein et al. (2014). Taming data complexity in lifelogs: Exploring visual cuts of personal informatics data. *DIS 2014*. https://doi.org/10.1145/2598510.2598558 | A "cut" (for example, past shifts at this workplace) helps people find patterns | D |
| Wirtz et al. (2003). What to do on spring break? The role of predicted, on-line, and remembered experience in future choice. *Psychological Science, 14*(5). https://doi.org/10.1111/1467-9280.03455 (new) | Choices follow remembered experience; a rating made right after the shift checks memory | D |
| Kahneman & Lovallo (1993). Timid choices and bold forecasts. *Management Science, 39*(1). https://doi.org/10.1287/mnsc.39.1.17 (new) | People ignore "the statistics of the past"; showing comparable shifts gives an outside view | D |
| Hertwig & Grüne-Yanoff (2017). Nudging and boosting. *Perspectives on Psychological Science, 12*(6). https://doi.org/10.1177/1745691617702496 (new) | Information without advice is a "boost", not a nudge | D |
| Bentvelzen et al. (2022). Revisiting reflection in HCI: Four design resources. *Proc. ACM IMWUT, 6*(1). https://doi.org/10.1145/3517233 | Temporal perspective and comparison invite reflection | D |

## 5. Privacy and workplace tracking

| Source | Why it matters | Check |
| --- | --- | --- |
| OAIC. *Employee records exemption*. https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/employee-records-exemption · *Privacy Act 1988* (Cth) s 7B(3): https://www.legislation.gov.au/C2004A03712/latest/text | An employer's employee records, health included, are exempt. Data that never reaches the employer never becomes such a record | V |
| *Lee v Superior Wood Pty Ltd* [2019] FWCFB 2946. https://www.fwc.gov.au/documents/decisionssigned/html/2019fwcfb2946.htm (new) | Collecting workers' biometric data needs genuine consent | V |
| Parliament of Victoria (2025). *Inquiry into workplace surveillance*. https://www.parliament.vic.gov.au/get-involved/inquiries/inquiryintoworkplacesurveillance/reports (new) | Names heart-rate wearables as workplace surveillance and finds weak federal protection | V |
| Attorney-General's Department (2023). *Privacy Act review report 2022* and the Government response. https://www.ag.gov.au/rights-and-protections/publications/privacy-act-review-report (new) | The gap is recognised (Proposal 7.1) but not closed | V |
| Ajunwa, Crawford & Schultz (2017). Limitless worker surveillance. *California Law Review, 105*(3). https://doi.org/10.15779/Z38BR8MF94 | Wellness tech extends monitoring on and off the job | D |
| Mettler & Wulf (2019). Physiolytics at the workplace. *Information Systems Journal, 29*(1). https://doi.org/10.1111/isj.12205 | Employees see wearables at work as threats to privacy and freedom | D |

## 6. Shift work, quick returns and recovery

| Source | Why it matters | Check |
| --- | --- | --- |
| Vedaa et al. (2016). Quick returns in shift work and health-related outcomes: a systematic review. *Ergonomics, 59*(1). https://doi.org/10.1080/00140139.2015.1052020 | 11 hours or less between shifts shortens sleep and raises fatigue | D |
| Schneider & Harknett (2019). Consequences of routine work-schedule instability. *American Sociological Review, 84*(1). https://doi.org/10.1177/0003122418823184 | Unstable schedules hurt sleep and wellbeing more than low wages | D |
| Harknett, Schneider & Irwin (2021). Improving health and economic security by reducing work schedule uncertainty. *PNAS, 118*(42). https://doi.org/10.1073/pnas.2107828118 (new) | Predictable schedules improved sleep and wellbeing (a natural experiment) | D |
| Garde et al. (2020). How to schedule night shift work to reduce health and safety risks. *Scand. J. Work Environ. Health, 46*(6). https://doi.org/10.5271/sjweh.3920 (new) | Experts recommend at least 11 hours between shifts | V |
| Kecklund & Axelsson (2016). Health consequences of shift work and insufficient sleep. *BMJ, 355*, i5210. https://doi.org/10.1136/bmj.i5210 | Short-term sleep loss is clear, long-term causes aren't, so no health claims | D |
| Geurts & Sonnentag (2006). Recovery as an explanatory mechanism. *Scand. J. Work Environ. Health, 32*(6). https://doi.org/10.5271/sjweh.1053 (new) | Recovery during and after work is the link from stress to health | V |

## 7. Garmin and Firstbeat stress measurement

### How Garmin computes stress

- **Firstbeat Technologies (2014).** *Stress and recovery analysis method based on 24-hour heart rate variability* (white paper). https://www.firstbeat.com/wp-content/uploads/2015/10/Stress-and-recovery_white-paper_20145.pdf [V]
  - It derives HRV from beat-to-beat heart data, filters out physical activity, then labels the rest as stress or recovery against the person's own resting level.
  - It describes Firstbeat's software. Garmin's watch firmware isn't published.
- **Garmin:**
  - *Stress tracking*: 0–100, "primarily using a combination of HR and HRV data", not measured during physical activity. https://www.garmin.com/en-US/garmin-technology/health-science/stress-tracking/ [V]
  - *Body Battery*: https://www.garmin.com/en-US/garmin-technology/health-science/body-battery/ [V]
  - *HRV status*: https://www.garmin.com/en-US/garmin-technology/health-science/hrv-status/ [V]
- **fēnix 8 owner's manual:**
  - "If you are too active for the watch to determine your stress level, stress measurements are not recorded." https://www8.garmin.com/manuals/webhelp/GUID-EECCAC99-90D6-4AB1-9A3A-EC433D3365E2/EN-US/GUID-97EA1540-A780-480F-BA4D-9A9E147FB225.html [V]
  - Heart-rate zones (heart-rate reserve): https://www8.garmin.com/manuals/webhelp/GUID-EECCAC99-90D6-4AB1-9A3A-EC433D3365E2/EN-US/GUID-30C91919-943C-44E9-8048-901AC0881AEA.html [V]
- **Connect IQ API, what a watch app can read:**
  - SensorHistory (stress and heart-rate history): https://developer.garmin.com/connect-iq/api-docs/Toybox/SensorHistory.html [V]
  - ActivityMonitor.Info (the stress bands 0–25, 26–50, 51–75, 76–100): https://developer.garmin.com/connect-iq/api-docs/Toybox/ActivityMonitor/Info.html [V]
  - UserProfile (`averageRestingHeartRate`): https://developer.garmin.com/connect-iq/api-docs/Toybox/UserProfile/Profile.html [V]

### HRV as a marker of stress

- **Task Force of the ESC and NASPE (1996).** Heart rate variability: Standards of measurement, physiological interpretation, and clinical use. *Circulation, 93*(5), 1043–1065. https://doi.org/10.1161/01.CIR.93.5.1043 [D]
- **Thayer et al. (2012).** A meta-analysis of heart rate variability and neuroimaging studies: Implications for HRV as a marker of stress and health. *Neuroscience & Biobehavioral Reviews, 36*(2), 747–756. https://doi.org/10.1016/j.neubiorev.2011.11.009 [D]
- **Kim et al. (2018).** Stress and heart rate variability: A meta-analysis and review of the literature. *Psychiatry Investigation, 15*(3), 235–245. https://doi.org/10.30773/pi.2017.08.17 [V]
- **Järvelin-Pasanen, Sinikallio & Tarvainen (2018).** Heart rate variability and occupational stress: Systematic review. *Industrial Health, 56*(6), 500–511. https://doi.org/10.2486/indhealth.2017-0190 [V] Higher job stress goes with lower HRV, measured at work.

### Does Garmin's score match felt stress?

- **Rosenbach et al. (2025).** Assessing stress level scores against wearables-driven physiological measurements. *Stress and Health, 41*(6), e70125. https://doi.org/10.1002/smi.70125 [D] · preprint: https://www.biorxiv.org/content/10.1101/2025.01.06.630177v1 [V]
  - Lab, n = 60. The score separated rest from stress tasks but barely predicted self-reported stress.
- **Siepe et al. (2025).** Associations between ecological momentary assessment and passive sensor data in a large student sample. *Journal of Psychopathology and Clinical Science, 134*(8), 912–925. https://doi.org/10.1037/abn0001013 [D]
  - 781 students over 3 months. Garmin stress "did not overlap" with self-reported stress for most people.
- **van der Mee, Koyuncu & Lemmers-Jansen (2025).** Are you stressed or just excited? What the Garmin Stress Score can say about your mood. *Journal of Affective Disorders Reports, 21*, 100974. https://doi.org/10.1016/j.jadr.2025.100974 [D]
  - The score went with arousal, not with bad mood.
- **Föhr et al. (2015).** Subjective stress, objective HRV-based stress, and recovery on workdays. *Journal of Occupational Medicine and Toxicology, 10*, 39. https://pmc.ncbi.nlm.nih.gov/articles/PMC4620623/ [V]
  - Firstbeat stress on workdays went with perceived stress, but only weakly.
- No study validates Garmin's score against cortisol. The white paper's cortisol figure comes from a 2006 conference abstract.

### Heart rate on the wrist, and the heart-rate-reserve bands

- **Bent et al. (2020).** Investigating sources of inaccuracy in wearable optical heart rate sensors. *npj Digital Medicine, 3*, 18. https://doi.org/10.1038/s41746-020-0226-6 [V]
  - Error was about 30% higher during activity than at rest. It didn't differ by skin tone.
- **Garber et al. (2011).** ACSM position stand. *Medicine & Science in Sports & Exercise, 43*(7), 1334–1359. https://doi.org/10.1249/MSS.0b013e318213fefb [V]
  - Intensity by heart-rate reserve: very light under 30%, light 30–39%, moderate 40–59%, vigorous 60–89%, near-maximal 90% and over. Offshift folds the last into vigorous.
- **Karvonen, Kentala & Mustala (1957).** The effects of training on heart rate; a longitudinal study. *Annales Medicinae Experimentalis et Biologiae Fenniae, 35*(3), 307–315. https://pubmed.ncbi.nlm.nih.gov/13470504/ [V]
  - The heart-rate-reserve method.
- **Dial et al. (2025).** Validation of nocturnal resting heart rate and heart rate variability in consumer wearables. *Physiological Reports, 13*(16), e70527. https://doi.org/10.14814/phy2.70527 [D]
  - A Garmin agreed best with ECG overnight.
