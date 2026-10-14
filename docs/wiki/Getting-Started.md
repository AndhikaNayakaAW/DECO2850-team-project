[Home](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki) · [Get started](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Getting-Started) · [Design](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Design-and-Research) · [Architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) · [Testing](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD) · [Deployment](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Deployment)

# Get started

Run one app, then open two views on your devices. The phone handles offers and replies; the calendar makes the week visible.

## 01 / Start the app

Use Node.js 24 LTS with npm (the release used for local validation). [Next.js requires Node.js 20.9 or newer](https://nextjs.org/docs/app/getting-started/installation#system-requirements).

```bash
git clone https://github.com/AndhikaNayakaAW/DECO2850-team-project.git
cd DECO2850-team-project/offshift-phone
npm ci
npm run dev
```

Open `http://localhost:3000` on the computer. Use the **Network URL** printed by Next.js on other devices; both devices must be on the same Wi-Fi network as the computer.

| View | Path | Use |
| :--- | :--- | :--- |
| Phone | `/` | Unlock, open Offshift, inspect an offer, draft a reply. |
| Calendar | `/calendar` | Browse the 3D week on an iPad or laptop. |
| Immersive | `/calendar?immersive=1` | Start directly in the wide exhibition view. |
| Reset calendar | `/calendar?reset=1` | Restore the shared demonstration scenario. |

## 02 / Try the care moment

1. Unlock the phone and open **Offshift**.
2. Open Jess's Thursday shift offer.
3. Read **Body**, **Week** and **Money**.
4. Choose a response and inspect the editable reply.
5. Keep the calendar open on the second device to see the shared scenario update.

Pandora Team, McDonald's Crew, myUQ and manager screens are simulated apps inside the prototype. They do not connect to those organisations.

## 03 / Use the calendar

| Input | Action |
| :--- | :--- |
| Drag empty space | Rotate the week. |
| Pinch or scroll | Zoom. |
| Tap a day or block | Inspect its details. |
| Double-tap | Reset the view. |
| **+ Plan** | Add a personal commitment. |
| **Reset** | Restore the demo data. |

Immersive mode adds optional camera gestures, voice, layer controls and confirmation steps. Touch, mouse and keyboard controls remain available; see the [prototype README](https://github.com/AndhikaNayakaAW/DECO2850-team-project/blob/main/offshift-phone/README.md) for the full gesture guide.

## Microphone and camera

For testing on an iPad, use HTTPS:

```bash
npm run dev:https
```

Open the printed HTTPS Network URL and accept the development certificate when prompted. Enable the camera or microphone through the app's consent controls. Typed input and response chips work without microphone access.

MediaPipe models are served locally from `public/mediapipe`. The optional hosted assistant needs server credentials; the scripted assistant works without them. Do not assume that the whole web application works offline.

## When the demo needs a fresh start

Use **Settings → Reset** on the phone, **Reset** on the calendar, or append `?reset=1` to the calendar URL. Accepted or declined offers are saved, so a missing amber offer may simply mean somebody already answered it.

**Next:** [Understand the architecture](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Architecture) or [run the checks](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Testing-and-TDD).
