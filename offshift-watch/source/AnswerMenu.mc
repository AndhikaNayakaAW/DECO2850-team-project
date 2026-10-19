import Toybox.Lang;
import Toybox.WatchUi;

//! The same five answers as the phone, each sent only after a confirmation.
function pushAnswerMenu(model as OffshiftModel, ask as Dictionary) as Void {
    var from = ask["from"] as String;
    var menu = new WatchUi.Menu2({ :theme => WatchUi.MENU_THEME_GREEN, :title => "Answer " + from });
    menu.addItem(new WatchUi.MenuItem("Take it", "Adds it to your week", "accept", null));
    menu.addItem(new WatchUi.MenuItem("Another time", ask["alt"] as String, "negotiate", null));
    menu.addItem(new WatchUi.MenuItem("Ask for a swap", (ask["swap"] as String) + " could take it", "swap", null));
    menu.addItem(new WatchUi.MenuItem("Not " + (ask["when"] as String), "Honest, no excuse", "decline", null));
    menu.addItem(new WatchUi.MenuItem("Decide later", "Reminder, nothing sent", "later", null));
    WatchUi.pushView(menu, new AnswerMenuDelegate(model, from), WatchUi.SLIDE_UP);
}

class AnswerMenuDelegate extends WatchUi.Menu2InputDelegate {
    private var _model as OffshiftModel;
    private var _from as String;

    function initialize(model as OffshiftModel, from as String) {
        Menu2InputDelegate.initialize();
        _model = model;
        _from = from;
    }

    function onSelect(item as MenuItem) as Void {
        var decision = item.getId() as String;
        WatchUi.popView(WatchUi.SLIDE_IMMEDIATE);
        if ("later".equals(decision)) {
            _model.answer(decision);
            return;
        }
        var prompt = "Send \"" + (item.getLabel() as String) + "\" to " + _from + "?";
        WatchUi.pushView(new WatchUi.Confirmation(prompt), new SendConfirmDelegate(_model, decision), WatchUi.SLIDE_IMMEDIATE);
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
