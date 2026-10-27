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
    var lastId as String = "";
    var lastDecision as String = "";
    function initialize() { OffshiftApi.initialize(); }
    function answer(id as String, decision as String, callback as ResponseCallback) as Void {
        sent += 1;
        lastId = id;
        lastDecision = decision;
    }
}

//! A second ask that arrives while the first one's menu or confirmation is open.
function nextAsk() as Dictionary {
    return { "ask" => { "id" => "o-sam-fri", "from" => "Sam", "employer" => "Cafe", "when" => "Friday", "time" => "8 am-1 pm", "week" => [], "status" => "pending" }, "waiting" => 1, "today" => [], "replied" => null };
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
    model.show(ask(false), shiftRead());
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
    model.show(ask(false), shiftRead());
    new SendConfirmDelegate(model, "o-jess-thu", "accept").onResponse(WatchUi.CONFIRM_NO);
    Test.assertEqual(api.sent, 0);
    return true;
}

(:test)
function confirmingAReplySendsTheChosenAnswer(logger as Test.Logger) as Boolean {
    var api = new AnswerSpy();
    var model = new QuietModel(api);
    model.show(ask(false), shiftRead());
    new SendConfirmDelegate(model, "o-jess-thu", "accept").onResponse(WatchUi.CONFIRM_YES);
    Test.assertEqual(api.sent, 1);
    Test.assertEqual(api.lastId, "o-jess-thu");
    Test.assertEqual(api.lastDecision, "accept");
    return true;
}

//! A refresh can bring a new ask while the confirmation is open. Yes still answers the ask the worker opened.
(:test)
function confirmingAnswersTheAskThatWasOpened(logger as Test.Logger) as Boolean {
    var api = new AnswerSpy();
    var model = new QuietModel(api);
    model.show(ask(false), shiftRead());
    var confirm = new SendConfirmDelegate(model, "o-jess-thu", "decline");
    model.show(nextAsk(), shiftRead());
    confirm.onResponse(WatchUi.CONFIRM_YES);
    Test.assertEqual(api.sent, 1);
    Test.assertEqual(api.lastId, "o-jess-thu");
    return true;
}

//! Decide later needs no confirmation, so it goes straight from the menu, to the ask the menu was opened for.
(:test)
function decidingLaterAnswersTheAskThatWasOpened(logger as Test.Logger) as Boolean {
    var api = new AnswerSpy();
    var model = new QuietModel(api);
    model.show(ask(false), shiftRead());
    var menu = new AnswerMenuDelegate(model, "o-jess-thu");
    model.show(nextAsk(), shiftRead());
    menu.onSelect(new WatchUi.MenuItem("Decide later", null, "later", null));
    Test.assertEqual(api.sent, 1);
    Test.assertEqual(api.lastId, "o-jess-thu");
    Test.assertEqual(api.lastDecision, "later");
    return true;
}
