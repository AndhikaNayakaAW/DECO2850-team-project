# Offshift Console — physical prototype spec (Iteration 1)

Illustrated version with front and top drawings: https://claude.ai/code/artifact/4032a79d-7593-4beb-9b09-01acf0f7ac0d

The web app built as an object on a shelf. Seven towers of light are the week. Three tokens are the answer. The phone still sends the message.

Size 320 × 130 × 210 mm · matte black base, frosted tubes · 126 LEDs · 1 screen · 0 links to the employer.

## Parts of the console

| # | Part | What it does |
|---|---|---|
| 1 | Day towers | Seven frosted tubes, 18 LEDs each, one per hour 06:00–24:00. Green = shift, grey = uni, amber = pending ask, soft green tower = protected rest. The 3D week from the app, standing up. |
| 2 | Rest ring | Slide it onto a tower to protect that day. Magnet in the ring, reed switch in the base. |
| 3 | The ask | The offered hours pulse amber. One soft chime when it arrives, then silence. |
| 4 | Fortnight line | LED line on the front face. Fills as pay covers essentials. Marker set by the slider. |
| 5 | Screen and speaker | One sentence at a time. Reads the draft reply aloud. |
| 6 | Check tiles | Body, Week, Money. Touch one: it lights green, amber or red and the screen shows its sentence. Towers highlight what it refers to. |
| 7 | Answer pad | Three identical tokens: Not tonight, Another time, Take it. Place one. No default, no order. |
| 8 | Day dial | With the Another time token down, turn it and the amber hours hop to another tower. |
| 9 | Off button | Hit it when you get home. The day's tower dims and the body pads light. |
| 10 | Body pads | Fine, Tired, Wiped. That is the whole check-in. |
| 11 | Essentials slider | Sets the marker on the fortnight line. |
| 12 | Priority switch | Health, Uni or Money first. Decides which tile lights first, nothing else. |
| 13 | Sweep sensor | Pass a hand left or right above the towers to see last or next week. |
| 14 | Tone switch | Warm or Plain, then "On your phone" sends the draft to the app. The console never messages anyone. |
| — | Lid | Fold it down: towers drop to one ambient glow, screen off. Calm mode and privacy in one move. |

## App screen to hardware

| In the app | On the console | Week 6 category | Studio tool |
|---|---|---|---|
| Week, 3D blocks | Seven day towers. Sweep a hand for last or next week. | Calm · Embodied | WS2812B, VL53L0X, Arduino |
| Ask card | Amber hours pulse in the tower. One chime. | Calm | Arduino |
| Body, Week, Money checks | Three lit tiles. Sentence on the screen. | Tangible | Makey Makey, M5stack |
| Not tonight / Another time / Take it | Three tokens on the pad. Day dial for another time. | Tangible · Playful | Makey Makey → RFID |
| Reply composer | Draft on screen, read aloud. Warm/Plain switch. Sent from the phone. | Voice | M5stack speaker, Web Speech |
| Check-in | Off button, then Fine / Tired / Wiped pads. | Embodied · Tangible | Arcade button, pads |
| Money and rest | Fortnight line with essentials slider. Rest ring on a tower. | Tangible · Calm | LED strip, slide pot, reed switch |
| Me | Priority switch. Rest ring. | Tangible | 3-position switch |
| Only you | Lid. No employer link. Nothing sends. | Calm | Hinge |
| 3D week | Point the phone at the base to see the same week in AR. | Extended reality | Three.js WebXR (optional) |

## How it works

**Iteration 1 (Week 8), laptop is the brain.** The phone app sends the offer to a laptop running the same web page in console mode (a teammate types it in: Wizard of Oz). Makey Makey turns the tiles, tokens, pads and Off button into key presses the page listens for. The page drives an Arduino over Web Serial, which drives the LEDs. The laptop reads the draft aloud and pushes it back to the phone. Nothing new to write except console mode in the page.

**Iteration 2, M5stack is the brain.** Laptop, Makey Makey and Arduino collapse into one M5stack Core2 (logic, screen, speaker). It talks to the phone over Bluetooth (offer in, draft out), drives the LEDs directly and reads RFID tokens, the ring, the dial and the sweep sensor. Port `offshift.logic.js`. No cloud, no employer link either way.

## Interaction types from Week 6

- **Tangible** (towers, ring, tokens, dial, slider, switch): placing a token is the decision; sliding the ring on is protecting rest.
- **Calm / Peripheral** (ambient glow, one chime, lid): on a shelf it is just light; it only changes when something needs the worker.
- **Voice** (speaker, screen): the draft is read aloud so it can be judged as speech, then edited on the phone.
- **Embodied** (Off button, sweep): hitting Off is the clocked-off ritual; a hand sweep moves the week.
- **Playful** (day dial, towers): amber hours hop between towers as you turn the dial; towers grow up on power-on.
- **Extended reality** (phone camera, optional): the app and the console are one model; point the phone at the base to see it in AR.

## Storyboard

1. **12:41, uni.** Jess texts. Dinda types the offer into the app. At home, Thursday's tower gets amber hours and the console chimes once.
2. **15:20, home.** She touches BODY. The tile goes amber. Screen: "2 shifts in 3 days. Last rated Tired." Tuesday's tower brightens.
3. **15:21.** She touches WEEK. The gap between the tute block and the amber hours lights up. "Tute ends 15:00. 35 min travel."
4. **15:22.** She touches MONEY. The fortnight line fills to the marker. "Covered by Saturday." The tile is green.
5. **15:24.** She places Not tonight. The amber fades. The speaker reads the draft. She flips to Plain, presses On your phone, sends it from Messages.
6. **Saturday 21:10.** She hits OFF. Saturday's tower dims. She presses Tired. Lid down. One soft glow in the room.

## Parts (AUD, approximate)

| Part | For | Source | AUD |
|---|---|---|---:|
| WS2812B LED strip, 60/m, 3 m | Towers, fortnight line, tiles, pads | Online | 20 |
| Frosted acrylic tube 20 mm × 7 | Towers (rolled tracing paper for Iteration 1) | Plastics supplier | 25 |
| Arduino Nano | LED driver | Studio kit | 0 |
| Makey Makey | Tiles, tokens, pads, Off, switches | Studio kit | 0 |
| M5stack Core2 | Screen, speaker, Iteration 2 brain | Studio kit | 0 |
| VL53L0X distance sensor | Hand sweep | Online | 6 |
| 60 mm arcade button | Off | Online | 6 |
| Slide pot, rotary encoder, 3-position switch, toggle | Essentials, day dial, priority, tone | Online | 12 |
| Reed switch and magnet | Rest ring | Online | 5 |
| RC522 RFID reader, 3 tags | Tokens, Iteration 2 | Online | 8 |
| 3 mm black acrylic, laser cut | Base and lid | Makerspace | 15 |
| Tokens and ring | 3D print or offcuts | Makerspace | 5 |
| 5 V 3 A supply | Power | Online | 10 |
| **Total with studio kit** | | | **≈ 110** |
| Iteration 1 in cardboard and paper tubes | | | ≈ 45 |

## Build plan to Week 8

| When | Do |
|---|---|
| Day 1 | Cardboard base. Seven paper tubes over LED strip. Arduino lights the example week. |
| Day 2 | Console mode in the web page: sends tower colours over Web Serial, listens for the Makey Makey keys. |
| Day 3 | Foil pads for three tiles, three token slots, three body pads and the Off button. Speech reads the draft. |
| Day 4 | Sketch and storyboard on the wall. Photograph every step for the exhibit board. |
| Day 5 | Two participants run the storyboard. Ask: was it your call, would you send that draft, did anything feel watched. |
| After | Laser-cut base, acrylic tubes, M5stack takes over, RFID tokens. Iteration 2. |

## Care checks

- **The worker decides.** Three tokens, same size, no default, no order. The dial makes "another time" as easy as "no".
- **Nothing leaves the console.** No link to the employer. The only thing that goes out is a draft, to the worker's own phone, to send or not.
- **Nothing is scored.** Light instead of numbers. Tired is a pad, not a graph. The lid ends the day.

Styling: matte black, chamfered edges, no visible screws, warm white tubes, labels engraved in mono. Green and grey only, with amber reserved for the one thing waiting on the worker.
