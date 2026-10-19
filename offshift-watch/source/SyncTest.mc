import Toybox.Lang;
import Toybox.Test;
import Toybox.WatchUi;

//! No network, sensors or toasts: exercise the same response and confirmation paths as the watch.
(:test)
class QuietModel extends OffshiftModel {
    var lastNote as String = "";
    function initialize(api as OffshiftApi) { OffshiftModel.initialize(api); }
    function note(text as String) as Void { lastNote = text; }
}

(:test)
class AnswerSpy extends OffshiftApi {
    var sent as Number = 0;
    var lastDecision as String = "";
    function initialize() { OffshiftApi.initialize(); }
    function answer(id as String, decision as String, callback as ResponseCallback) as Void {
        sent += 1;
        lastDecision = decision;
    }
}

(:test)
function successfulReplyClearsOldOfflineStatus(logger as Test.Logger) as Boolean {
    var model = new QuietModel(new OffshiftApi());
    model.onSummary(503, null);
    model.onAnswered(200, { "ask" => null, "waiting" => 0, "toast" => "Sent" });
    Test.assertEqual(model.status(), "");
    Test.assert(model.syncedAt() != null);
    return true;
}

(:test)
function accessFailureExplainsHowToReconnect(logger as Test.Logger) as Boolean {
    var model = new QuietModel(new OffshiftApi());
    model.onSummary(401, null);
    Test.assertEqual(model.status(), "Access code needed");
    Test.assert(model.syncedAt() == null);
    return true;
}

(:test)
function failedReplyKeepsTheAskAndLastSync(logger as Test.Logger) as Boolean {
    var model = new QuietModel(new OffshiftApi());
    model.show(ask(false), allLevels());
    var before = model.syncedAt();
    model.onAnswered(503, null);
    Test.assertEqual((model.ask() as Dictionary)["id"], "o-jess-thu");
    Test.assertEqual(model.syncedAt(), before);
    Test.assertEqual(model.lastNote, "Not sent. Try again.");
    return true;
}

(:test)
function cancellingAReplySendsNothing(logger as Test.Logger) as Boolean {
    var api = new AnswerSpy();
    var model = new QuietModel(api);
    model.show(ask(false), allLevels());
    new SendConfirmDelegate(model, "accept").onResponse(WatchUi.CONFIRM_NO);
    Test.assertEqual(api.sent, 0);
    return true;
}

(:test)
function confirmingAReplySendsTheChosenAnswer(logger as Test.Logger) as Boolean {
    var api = new AnswerSpy();
    var model = new QuietModel(api);
    model.show(ask(false), allLevels());
    new SendConfirmDelegate(model, "accept").onResponse(WatchUi.CONFIRM_YES);
    Test.assertEqual(api.sent, 1);
    Test.assertEqual(api.lastDecision, "accept");
    return true;
}
