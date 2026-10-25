import Toybox.Application;
import Toybox.Lang;
import Toybox.Test;
import Toybox.Time;

//! The watch reads heart rate and stress during a shift only, 15 minutes at a time,
//! and sends a level from 0 to 3 per block, never a number.

(:test)
function stressUsesGarminsBandsAsLoad(logger as Test.Logger) as Boolean {
    Test.assertEqual(ShiftBody.stressLoad(10), 0);
    Test.assertEqual(ShiftBody.stressLoad(25), 0);
    Test.assertEqual(ShiftBody.stressLoad(26), 1);
    Test.assertEqual(ShiftBody.stressLoad(50), 1);
    Test.assertEqual(ShiftBody.stressLoad(51), 2);
    Test.assertEqual(ShiftBody.stressLoad(75), 2);
    Test.assertEqual(ShiftBody.stressLoad(76), 3);
    Test.assert(ShiftBody.stressLoad(null) == null);
    Test.assert(ShiftBody.stressLoad(-1) == null);
    return true;
}

//! Resting 60 and maximum 190 leave a reserve of 130 beats a minute.
(:test)
function heartUsesTheShareOfHeartRateReserve(logger as Test.Logger) as Boolean {
    Test.assertEqual(ShiftBody.heartLoad(90, 60, 190), 0);
    Test.assertEqual(ShiftBody.heartLoad(99, 60, 190), 1);
    Test.assertEqual(ShiftBody.heartLoad(112, 60, 190), 2);
    Test.assertEqual(ShiftBody.heartLoad(138, 60, 190), 3);
    Test.assertEqual(ShiftBody.heartLoad(55, 60, 190), 0);
    Test.assert(ShiftBody.heartLoad(100, null, 190) == null);
    Test.assert(ShiftBody.heartLoad(100, 60, null) == null);
    Test.assert(ShiftBody.heartLoad(null, 60, 190) == null);
    return true;
}

(:test)
function samplesAverageIntoQuarterHoursOfTheShift(logger as Test.Logger) as Boolean {
    var from = 1000000;
    var blocks = new Blocks(from, from + 3600);
    Test.assertEqual(blocks.count(), 4);
    blocks.add(from + 60, 20);
    blocks.add(from + 400, 30);
    blocks.add(from + 910, 80);
    blocks.add(from + 1800, 50);
    blocks.add(from + 1900, 52);
    blocks.add(from - 5, 99);
    blocks.add(from + 3600, 99);
    var avg = blocks.averages(2);
    Test.assertEqual(avg[0], 25);
    Test.assert(avg[1] == null);
    Test.assertEqual(avg[2], 51);
    Test.assert(avg[3] == null);
    Test.assertEqual(new Blocks(0, 4200).count(), 5);
    return true;
}

(:test)
function onlyLevelsLeaveTheWatch(logger as Test.Logger) as Boolean {
    var levels = ShiftBody.levels([10, 30, 60, 90, null] as Array<Number?>, [90, 99, 112, 138, null] as Array<Number?>, 60, 190);
    var stress = levels["stress"] as Array;
    var heart = levels["heart"] as Array;
    for (var i = 0; i < 4; i++) {
        Test.assertEqual(stress[i], i);
        Test.assertEqual(heart[i], i);
    }
    Test.assert(stress[4] == null);
    Test.assert(heart[4] == null);
    return true;
}

(:test)
function aShiftsPayloadHasOneLevelPerBlockAndNothingElse(logger as Test.Logger) as Boolean {
    var now = Time.now().value();
    var due = { "id" => "s-thu-am", "from" => now - 4 * 3600, "to" => now - 3600 };
    var p = ShiftBody.payload(due, ShiftBody.levelsFor(due)) as Dictionary;
    Test.assertEqual(p["shiftId"], "s-thu-am");
    Test.assertEqual(p["from"], now - 4 * 3600);
    Test.assertEqual(p["to"], now - 3600);
    Test.assertEqual(p.keys().size(), 5);
    var signals = ["stress", "heart"] as Array<String>;
    for (var s = 0; s < 2; s++) {
        // Plain text on the wire: a watch request body can't be relied on to carry lists or nulls.
        var text = p[signals[s]] as String;
        Test.assertEqual(text.length(), 12);
        var chars = text.toCharArray();
        for (var i = 0; i < chars.size(); i++) {
            Test.assert("0123-".find(chars[i].toString()) != null);
        }
    }
    return true;
}

(:test)
function aShiftReadsInPlainWords(logger as Test.Logger) as Boolean {
    Test.assertEqual(ShiftBody.summary([1, 1, 1, 3, 3, 1] as Array<Number?>, "stress"), "Mostly low, high 30 min");
    Test.assertEqual(ShiftBody.summary([0, 0, null] as Array<Number?>, "heart"), "Mostly very light");
    Test.assertEqual(ShiftBody.summary([null, null] as Array<Number?>, "stress"), "No reading");
    return true;
}

(:test)
class BodySpy extends OffshiftApi {
    var sent as Number = 0;
    var last as Dictionary? = null;
    function initialize() { OffshiftApi.initialize(); }
    function sendShiftBody(payload as Dictionary, callback as ResponseCallback) as Void {
        sent += 1;
        last = payload;
    }
}

function shiftToRead(from as Number) as Dictionary {
    return { "ask" => null, "waiting" => 0, "today" => [], "replied" => null, "checkIn" => null, "shiftBody" => { "id" => "s-thu-am", "title" => "Cafe, 8 am - 12:45 pm", "from" => from, "to" => from + 4 * 3600 + 45 * 60 } };
}

function restoreSharing(was as Boolean?) as Void {
    if (was == null) {
        Application.Storage.deleteValue("share");
    } else {
        Sharing.set(was);
    }
    Application.Storage.deleteValue("sentShiftBody");
}

(:test)
function aFinishedShiftIsReadAndSentOnceWhileSharing(logger as Test.Logger) as Boolean {
    var was = Sharing.choice();
    Sharing.set(true);
    Application.Storage.deleteValue("sentShiftBody");
    var api = new BodySpy();
    var model = new QuietModel(api);
    var summary = shiftToRead(Time.now().value() - 5 * 3600);
    model.readShift(summary);
    Test.assertEqual(api.sent, 1);
    Test.assertEqual((api.last as Dictionary)["shiftId"], "s-thu-am");
    Test.assertEqual(((api.last as Dictionary)["stress"] as String).length(), 19);
    model.onShiftBodySent(200, summary);
    model.readShift(summary);
    Test.assertEqual(api.sent, 1);
    restoreSharing(was);
    return true;
}

(:test)
function nothingIsReadWithoutSharing(logger as Test.Logger) as Boolean {
    var was = Sharing.choice();
    Sharing.set(false);
    var api = new BodySpy();
    var model = new QuietModel(api);
    model.readShift(shiftToRead(Time.now().value() - 5 * 3600));
    Test.assertEqual(api.sent, 0);
    restoreSharing(was);
    return true;
}

(:test)
function theAskShowsHowTheLastShiftsThereWent(logger as Test.Logger) as Boolean {
    var summary = ask(false);
    var a = summary["ask"] as Dictionary;
    a["past"] = "Last 2 at Pandora: Hard, Busy";
    var model = new OffshiftModel(new OffshiftApi());
    model.show(summary, null);
    var rows = Pages.make(model, Pages.WEEK).rows();
    Test.assertEqual(rows[0].text, "Last 2 at Pandora: Hard, Busy");
    return true;
}

(:test)
class SharingSpy extends OffshiftApi {
    var stops as Number = 0;
    var summaries as Number = 0;
    function initialize() { OffshiftApi.initialize(); }
    function stopSharing(callback as ResponseCallback) as Void { stops += 1; }
    function getSummary(callback as ResponseCallback) as Void { summaries += 1; }
}

function nothingHeld() as Dictionary {
    return { "ask" => null, "waiting" => 0, "today" => [], "replied" => null, "readings" => 0 };
}

//! Turning sharing off must reach the calendar: until it answers, the watch keeps asking it to forget.
(:test)
function turningSharingOffIsSentAgainUntilTheCalendarForgets(logger as Test.Logger) as Boolean {
    var was = Sharing.choice();
    Application.Storage.deleteValue("forgetPending");
    var api = new SharingSpy();
    var model = new QuietModel(api);
    model.setSharing(false);
    Test.assertEqual(api.stops, 1);
    model.onForgotten(503, null);
    model.refresh();
    Test.assertEqual(api.stops, 2);
    model.onForgotten(200, nothingHeld());
    model.refresh();
    Test.assertEqual(api.stops, 2);
    Test.assertEqual(api.summaries, 1);
    restoreSharing(was);
    Application.Storage.deleteValue("forgetPending");
    return true;
}

//! A send that crossed the "sharing off", or a forget that failed: the calendar still holds readings, so forget again.
(:test)
function readingsStillOnTheCalendarWhileSharingIsOffAreForgottenAgain(logger as Test.Logger) as Boolean {
    var was = Sharing.choice();
    Sharing.set(false);
    Application.Storage.deleteValue("forgetPending");
    var api = new SharingSpy();
    var model = new QuietModel(api);
    var held = nothingHeld();
    held["readings"] = 2;
    model.onSummary(200, held);
    model.refresh();
    Test.assertEqual(api.stops, 1);
    restoreSharing(was);
    Application.Storage.deleteValue("forgetPending");
    return true;
}

(:test)
function aShiftTheCalendarRefusesIsNotSentAgain(logger as Test.Logger) as Boolean {
    var was = Sharing.choice();
    Sharing.set(true);
    Application.Storage.deleteValue("sentShiftBody");
    var api = new BodySpy();
    var model = new QuietModel(api);
    var summary = shiftToRead(Time.now().value() - 5 * 3600);
    model.readShift(summary);
    model.onShiftBodySent(409, null);
    model.readShift(summary);
    Test.assertEqual(api.sent, 1);
    restoreSharing(was);
    return true;
}

(:test)
function aFailedSendWaitsBeforeTryingAgain(logger as Test.Logger) as Boolean {
    var was = Sharing.choice();
    Sharing.set(true);
    Application.Storage.deleteValue("sentShiftBody");
    var api = new BodySpy();
    var model = new QuietModel(api);
    var summary = shiftToRead(Time.now().value() - 5 * 3600);
    model.readShift(summary);
    model.onShiftBodySent(503, null);
    model.readShift(summary);
    Test.assertEqual(api.sent, 1);
    restoreSharing(was);
    return true;
}

(:test)
function levelsTravelAsOneCharacterPerQuarterHour(logger as Test.Logger) as Boolean {
    Test.assertEqual(ShiftBody.wire([1, null, 3, 0] as Array<Number?>), "1-30");
    Test.assertEqual(ShiftBody.wire([null, null] as Array<Number?>), "--");
    return true;
}

//! A shift that failed under the old list format is read and sent again once this build is installed.
(:test)
function theSendKeyNamesTheFormat(logger as Test.Logger) as Boolean {
    Test.assertEqual(ShiftBody.key({ "id" => "s1", "from" => 100, "to" => 2800 }), "2:s1@100-2800");
    return true;
}

//! The worker can see on the watch whether the last shift reached the calendar.
(:test)
function theLastSendShowsOnTheWatch(logger as Test.Logger) as Boolean {
    var was = Sharing.choice();
    Sharing.set(true);
    Application.Storage.deleteValue("sentShiftBody");
    Application.Storage.deleteValue("lastSend");
    Test.assertEqual(ShiftBody.sendNote(), "Not sent yet");
    var api = new BodySpy();
    var model = new QuietModel(api);
    var summary = shiftToRead(Time.now().value() - 5 * 3600);
    model.readShift(summary);
    model.onShiftBodySent(503, null);
    Test.assertEqual(ShiftBody.sendNote(), "Not saved yet (503)");
    Application.Storage.deleteValue("sentShiftBody");
    var again = new QuietModel(api);
    again.readShift(summary);
    again.onShiftBodySent(200, null);
    Test.assertEqual(ShiftBody.sendNote(), "Saved on your calendar");
    restoreSharing(was);
    Application.Storage.deleteValue("lastSend");
    return true;
}
