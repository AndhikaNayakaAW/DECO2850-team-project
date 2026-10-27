import Toybox.Lang;
import Toybox.Test;
import Toybox.WatchUi;

(:test)
class RateSpy extends OffshiftApi {
    var sent as Number = 0;
    var lastShift as String = "";
    var lastLevel as String = "";
    function initialize() { OffshiftApi.initialize(); }
    function rate(shiftId as String, level as String, callback as ResponseCallback) as Void {
        sent += 1;
        lastShift = shiftId;
        lastLevel = level;
    }
}

function finishedShift() as Dictionary {
    return { "ask" => null, "waiting" => 0, "today" => [], "replied" => null, "checkIn" => { "id" => "s-thu-am", "title" => "Cafe, 8 am - 12:45 pm" } };
}

//! After a shift, the watch asks how the work was: four work words in order, then Skip.
(:test)
function aFinishedShiftOffersFourWorkWordsThenSkip(logger as Test.Logger) as Boolean {
    var choices = checkInChoices();
    Test.assertEqual(choices.size(), 5);
    var ids = ["light", "steady", "busy", "hard", "skip"];
    var labels = ["Light", "Steady", "Busy", "Hard", "Skip"];
    for (var i = 0; i < 5; i++) {
        Test.assertEqual((choices[i] as Array)[0], labels[i]);
        Test.assertEqual((choices[i] as Array)[2], ids[i]);
    }
    return true;
}

(:test)
function pickingAWordSendsItForThatShift(logger as Test.Logger) as Boolean {
    var api = new RateSpy();
    var model = new QuietModel(api);
    model.show(finishedShift(), shiftRead());
    Test.assertEqual((model.checkIn() as Dictionary)["id"], "s-thu-am");
    new CheckInDelegate(model, "s-thu-am").onSelect(new WatchUi.MenuItem("Busy", null, "busy", null));
    Test.assertEqual(api.sent, 1);
    Test.assertEqual(api.lastShift, "s-thu-am");
    Test.assertEqual(api.lastLevel, "busy");
    return true;
}

//! A refresh can move on while the question is open. The word still goes to the shift the worker was asked about.
(:test)
function aWordGoesToTheShiftThatWasAsked(logger as Test.Logger) as Boolean {
    var api = new RateSpy();
    var model = new QuietModel(api);
    model.show(finishedShift(), shiftRead());
    var menu = new CheckInDelegate(model, "s-thu-am");
    model.show(ask(false), shiftRead());
    menu.onSelect(new WatchUi.MenuItem("Hard", null, "hard", null));
    Test.assertEqual(api.sent, 1);
    Test.assertEqual(api.lastShift, "s-thu-am");
    Test.assertEqual(api.lastLevel, "hard");
    return true;
}

//! Backing out is not an answer: nothing is sent, and the shift stays rateable on the calendar.
(:test)
function backingOutOfTheCheckInSendsNothing(logger as Test.Logger) as Boolean {
    var api = new RateSpy();
    var model = new QuietModel(api);
    model.show(finishedShift(), shiftRead());
    new CheckInDelegate(model, "s-thu-am").onBack();
    Test.assertEqual(api.sent, 0);
    return true;
}
