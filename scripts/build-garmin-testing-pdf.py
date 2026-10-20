#!/usr/bin/env python3
"""Render the dated Garmin test record. Requires reportlab; no network access."""
from pathlib import Path
import hashlib
import json

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "docs/testing/garmin-2026-10-20"
OUTPUT = BASE / "Offshift-Garmin-Testing-2026-10-20.pdf"
W, H = A4
M = 46
INK = colors.HexColor("#1D2A25")
GREEN = colors.HexColor("#374938")
MUTED = colors.HexColor("#566C51")
CREAM = colors.HexColor("#F5F2ED")
GOLD = colors.HexColor("#8A6520")
LINE = colors.HexColor("#D8DED3")
STYLE = ParagraphStyle("body", fontName="Helvetica", fontSize=11,
                       leading=16, textColor=INK, spaceAfter=10)
SMALL = ParagraphStyle("small", parent=STYLE, fontSize=9, leading=13,
                       textColor=MUTED)


def paragraph(text, x, top, width, style=STYLE):
    p = Paragraph(text, style)
    _, height = p.wrap(width, H)
    assert top - height > 62, "Page text would overlap the footer"
    p.drawOn(pdf, x, top - height)
    return top - height - 12


def page(title, category):
    pdf.setFillColor(CREAM)
    pdf.rect(0, 0, W, H, fill=1, stroke=0)
    pdf.setFillColor(GREEN)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(M, H - 36, "OFFSHIFT / GARMIN")
    pdf.setFillColor(GOLD)
    pdf.setFont("Helvetica", 9)
    pdf.drawRightString(W - M, H - 36, category.upper())
    pdf.setStrokeColor(LINE)
    pdf.line(M, H - 48, W - M, H - 48)
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 26)
    pdf.drawString(M, H - 89, title)
    pdf.setFont("Helvetica", 8)
    pdf.setFillColor(MUTED)
    pdf.drawString(M, 31, "20 October 2026 / Australia-Brisbane / Andhika Nayaka Arya Wibowo")
    pdf.drawRightString(W - M, 31, str(pdf.getPageNumber()))


def screenshot(name, x, bottom, size):
    # Clip only the PDF placement to the round display. Source PNG pixels stay unchanged.
    source = BASE / "screenshots" / name
    assert source.is_file(), source
    pdf.saveState()
    clip = pdf.beginPath()
    clip.circle(x + size / 2, bottom + size / 2, size / 2)
    pdf.clipPath(clip, stroke=0)
    picture = Image.open(source)
    iw, ih = picture.size
    if iw != ih:
        # Embed only the visible display pixels, losslessly, to keep the PDF small.
        # Original screenshots and their hashes remain unchanged.
        factor = iw / 713
        picture = picture.crop(tuple(round(v * factor) for v in (134, 249, 588, 703)))
    pdf.drawImage(ImageReader(picture), x, bottom, width=size, height=size, mask="auto")
    pdf.restoreState()
    pdf.setStrokeColor(LINE)
    pdf.circle(x + size / 2, bottom + size / 2, size / 2, stroke=1, fill=0)


def case(title, images, aim, steps, observed, limit):
    page(title, "Native simulator / synthetic fixture")
    top = paragraph("<b>Check:</b> " + aim, M, H - 112, W - 2 * M, SMALL)
    size = 308 if len(images) == 1 else 228
    bottom = top - size - 18
    if len(images) == 1:
        screenshot(images[0], (W - size) / 2, bottom, size)
    else:
        screenshot(images[0], M, bottom, size)
        screenshot(images[1], W - M - size, bottom, size)
    top = bottom - 24
    top = paragraph("<b>Procedure.</b> " + steps, M, top, W - 2 * M)
    top = paragraph("<b>Observed.</b> " + observed, M, top, W - 2 * M)
    paragraph("<b>Evidence boundary.</b> " + limit, M, top, W - 2 * M, SMALL)
    pdf.showPage()


physical = json.loads((BASE / "evidence/physical-watch.json").read_text())
install = json.loads((BASE / "evidence/install-update.json").read_text())
after_update = ("A fresh post-transfer production contact was also observed."
                if install.get("postTransferWatchContactAt") else
                "The owner reports Synced after the update; a post-transfer production contact has not yet been observed.")
pdf = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
pdf.setTitle("Offshift Garmin: screen walkthrough and physical connection testing")
pdf.setAuthor("Andhika Nayaka Arya Wibowo; prepared with Codex assistance")

page("Watch screens. Verified connection.", "Testing record")
top = paragraph("<b>fenix 8 47mm / 20 October 2026</b><br/>"
                "Native screen walkthrough, production round trip and a regression fix.",
                M, H - 120, W - 2 * M)
screenshot("01-ask-display.png", (W - 245) / 2, top - 260, 245)
top -= 286
top = paragraph("<b>Physical connection verified.</b> The owner saw the synthetic request on the "
                "watch and confirmed a Take it prompt. Vercel recorded one accepted reply and "
                "one calendar shift. The test request, reply and shift were removed afterward.",
                M, top, W - 2 * M)
top = paragraph("<b>Available bands delivered.</b> A Garmin wearable record arrived with "
                f"{physical['wearableDelivery']['signalCount']} available signal bands. Personal band "
                "values are excluded from this report. The simulator used a separate local server.",
                M, top, W - 2 * M)
top = paragraph("<b>Regression fixed.</b> Timestamp-only health uploads now fall back to fetching "
                "the calendar. Native tests increased from 24 to 26, all passing. The corrected "
    "release was transferred and verified by readback.", M, top, W - 2 * M)
paragraph("Every watch image in this PDF is a native Garmin simulator capture using synthetic "
          "data, not a photograph or remote capture of the physical watch. Physical evidence comes "
          "from owner observations and production state/team API records.", M, top, W - 2 * M, SMALL)
pdf.showPage()

BOUNDARY = "Native simulator on the fenix847mm profile. Names, schedules and sensor values shown here are synthetic."
case("01 / Ask", ["01-ask-display.png"],
     "Identify who is asking, the workplace, day and shift time.",
     "Start the app against an isolated file-backed server on port 3002. Send an Alex / Test Cafe request for tomorrow, 4-9 pm.",
     "The Ask card shows the sender, workplace, relative date and time. The first page indicator is active. Pressing Select opens the answer menu.", BOUNDARY)
case("02 / Around it", ["02-around-it.png"],
     "Read the activity context around a pending shift.",
     "Move down once from Ask with a synthetic practice week loaded.",
     "Around it presents the available schedule context, including the adjacent shift and the next day's start. This is calendar context, not a claim about fatigue or causation.", BOUNDARY)
case("03 / Body", ["03-body.png"],
     "Distinguish available words from missing readings.",
     "Move to Body with the simulator's default sensor fixtures. Open details using Select.",
     "The page shows a synthetic overall word and stress band. Sleep and heart can remain No reading when the required history is absent. The screenshot is not the wearer's physiological data.",
     BOUNDARY + " Physiological accuracy and research outcomes were not evaluated by these UI checks.")
case("04 / Calendar", ["04-calendar.png"],
     "Show connection status and the body-sharing choice.",
     "Move to Calendar after the local API has answered. Review the successful sync time and sharing label.",
     "The screen reports Synced, the current request count and whether body words are shared. Separate production observations verified a fresh physical watch connection.", BOUNDARY)
case("05 / Details and sharing", ["05-body-details.png", "06-sharing-off.png"],
     "Inspect individual signals and find the sharing switch.",
     "Open Your body. Scroll through the available signals to Share with calendar.",
     "Native Garmin menus show signal details and unavailable values. The disabled sharing switch says Stays on watch. Long menu labels scroll or truncate within the native list.",
     BOUNDARY + " Numeric detail in these simulator menus is synthetic; native raw values are not uploaded to the calendar.")
case("06 / Sharing enabled", ["07-sharing-on.png"],
     "Enable optional sharing without changing the schedule.",
     "Toggle Share with calendar on in the isolated simulator session.",
     "The switch changes to Words only, and the local server receives a wearable record. The physical test separately received available Garmin bands under the watch's existing sharing choice.", BOUNDARY)
case("07 / Answer and confirm", ["08-answer-menu.png", "09-confirm-take-it.png"],
     "Keep choosing an answer separate from sending it.",
     "Open the answer menu and select Take it. Inspect the confirmation. Cancel before sending in the simulator check.",
     "The menu presents the five response choices. The native prompt identifies the chosen response and recipient. Cancellation left the local request pending with no worker reply at that checkpoint. The physical owner later confirmed Take it and one acceptance was recorded.", BOUNDARY)
case("08 / Other choices and reply", ["10-decline-selected.png", "11-confirm-another-time.png"],
     "Inspect alternatives and verify a confirmed counter-offer.",
     "Scroll the menu to inspect Not tomorrow and Decide later. In a separate selection, choose Another time and confirm it.",
     "The decline option is visible. The Another time confirmation names Alex; the local server recorded one countered request and one worker message. This is not a physical-watch decline test.", BOUNDARY)
case("09 / After a reply", ["12-reply-sent.png", "13-today.png"],
     "Return to an understandable state after the request is answered.",
     "Allow the local counter-offer to synchronize, then inspect Ask and the next page.",
     "Ask shows Nothing waiting and Another time offered. The next page changes to Today and lists the synthetic day's plans. Offering another time does not automatically move a confirmed roster shift.", BOUNDARY)
case("10 / Connection failures", ["14-calendar-offline.png", "15-access-needed.png"],
     "Explain an unavailable server and a missing access code distinctly.",
     "Stop the isolated local server, then restart it temporarily with a simulator-only access code. Restore normal local access afterward.",
     "Calendar shows an offline status when its server cannot be reached and Access code needed when the API returns 401. Neither state presents a failed request as a fresh sync.",
     BOUNDARY + " These faults were injected only into the local simulator server, never production.")

page("11 / Regression and commit flow", "Observed red / green")
top = H - 122
for text in [
    "<b>Trigger.</b> Sharing is enabled while every sensor history value is unavailable. The previous payload contained only a clock time. The local watch API rejected it with HTTP 400, which could briefly appear as a calendar failure.",
    "<b>Red: 6e81a03.</b> Added a regression requiring unavailable readings to produce no health upload, plus a guard showing that band zero is still a real reading. The Garmin runner reported 25 passes and one assertion error: ASSERTION FAILED in the new missing-reading test.",
    "<b>Green: 9465c22.</b> Health.payload returns null if no signal exists. Foreground and background paths send health only for a non-null payload; otherwise they perform the ordinary calendar GET. Band thresholds, consent and confirmation behavior are unchanged.",
    "<b>Result.</b> All 26 native tests passed. The private production release compiled successfully and its 37,452-byte transfer matched the readback SHA-256. " + after_update,
    "<b>Scope.</b> This fixes missing-data handling. It does not manufacture readings, clear an older shared record automatically or validate the meaning of physiological bands.",
]:
    top = paragraph(text, M, top, W - 2 * M)
paragraph("Raw evidence: evidence/native-red.txt, evidence/native-green.txt and evidence/install-update.json. "
          "The SDK process can exit with status 1 even when its final test summary reports a complete pass; the summary was checked explicitly.",
          M, top, W - 2 * M, SMALL)
pdf.showPage()

page("12 / Evidence and limits", "Verification record")
top = H - 122
for text in [
    "<b>Physical watch.</b> Fresh production contact, visibility of the synthetic request, one confirmed acceptance, exactly one resulting shift, and available Garmin bands were verified. Cleanup preserved the session and wearable record. The initial decline/accept discrepancy was resolved when the owner confirmed that the actual prompt said Take it.",
    "<b>Automated checks.</b> 200 web tests passed across 20 files. The web production build and its TypeScript check passed. All 26 native tests and nine Node build tests passed. The 19 October record separately documents 17 earlier synthetic production API checks; those are not counted as today's physical checks.",
    "<b>Update delivery.</b> The production binary stays private because it contains the protected endpoint. Only Offshift was queued in GARMIN/Apps; existing files were not deleted. An earlier verified release is retained privately. A running app can be absent from the visible MTP PRG listing, so that listing does not establish whether an app was already installed.",
    "<b>Still unverified.</b> Long-term reliability, exact five-minute background scheduling, battery impact, every physical response variant, every sensor type and participant outcomes require further testing. Simulator screenshots do not prove physical text comfort, real sensor accuracy or reduced stress.",
    "<b>Architecture boundary.</b> The native app uses the paired phone and Garmin Connect to reach Vercel and Redis. The Mac is used for development and installation. The /watch webpage is a separate browser preview. This release does not implement manual Wi-Fi sync or separate employer/worker account roles.",
]:
    top = paragraph(text, M, top, W - 2 * M)
top = paragraph("<b>Source and handoff.</b> See README.md and evidence/*.json beside this PDF for commands, "
                "timestamps, readback hashes and screenshot provenance. Contribution documentation was prepared with Codex assistance.",
                M, top, W - 2 * M, SMALL)
paragraph('<link href="https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Weekly-Contribution" color="#374938">Project wiki and contribution record</link>',
          M, top, W - 2 * M, SMALL)
pdf.showPage()
pdf.save()
print(json.dumps({"pdf": str(OUTPUT.relative_to(ROOT)), "sha256": hashlib.sha256(OUTPUT.read_bytes()).hexdigest()}))
