import Toybox.Lang;
import Toybox.WatchUi;

//! The same three answers as the calendar: label and the answer the server takes. No line under them.
function answerChoices(ask as Dictionary) as Array {
    var choices = [
        ["Accept", "accept"],
        ["Decline", "decline"]
    ];
    if (!"deferred".equals(ask["status"])) {
        choices.add(["Decide later", "later"]);
    }
    return choices;
}

//! What the watch asks before an answer changes the week. Nothing is sent to the manager.
function answerPrompt(decision as String) as String {
    return "accept".equals(decision) ? "Add this shift to your week?" : "Decline this shift?";
}

function pushAnswerMenu(model as OffshiftModel, ask as Dictionary) as Void {
    var menu = new WatchUi.Menu2({ :theme => WatchUi.MENU_THEME_GREEN, :title => "Answer " + (ask["from"] as String) });
    var choices = answerChoices(ask);
    for (var i = 0; i < choices.size(); i++) {
        var c = choices[i] as Array;
        menu.addItem(new WatchUi.MenuItem(c[0] as String, null, c[1] as String, null));
    }
    WatchUi.pushView(menu, new AnswerMenuDelegate(model), WatchUi.SLIDE_UP);
}

class AnswerMenuDelegate extends WatchUi.Menu2InputDelegate {
    private var _model as OffshiftModel;

    function initialize(model as OffshiftModel) {
        Menu2InputDelegate.initialize();
        _model = model;
    }

    function onSelect(item as MenuItem) as Void {
        var decision = item.getId() as String;
        WatchUi.popView(WatchUi.SLIDE_IMMEDIATE);
        // Later only changes how the ask looks, so it needs no confirmation.
        if ("later".equals(decision)) {
            _model.answer(decision);
            return;
        }
        WatchUi.pushView(new WatchUi.Confirmation(answerPrompt(decision)), new SendConfirmDelegate(_model, decision), WatchUi.SLIDE_IMMEDIATE);
    }

    function onBack() as Void {
        WatchUi.popView(WatchUi.SLIDE_DOWN);
    }
}

class SendConfirmDelegate extends WatchUi.ConfirmationDelegate {
    private var _model as OffshiftModel;
    private var _decision as String;

    function initialize(model as OffshiftModel, decision as String) {
        ConfirmationDelegate.initialize();
        _model = model;
        _decision = decision;
    }

    function onResponse(response as Confirm) as Boolean {
        if (response == WatchUi.CONFIRM_YES) {
            _model.answer(_decision);
        }
        return true;
    }
}
