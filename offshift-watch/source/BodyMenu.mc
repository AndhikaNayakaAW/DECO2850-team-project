import Toybox.Lang;
import Toybox.WatchUi;

//! The last shift in detail: stress and heart in words, where each comes from, and the sharing switch.
function pushBodyMenu(model as OffshiftModel) as Void {
    var last = model.lastShift();
    var menu = new WatchUi.Menu2({ :theme => WatchUi.MENU_THEME_GREEN, :title => "Your shifts" });
    var signals = ["stress", "heart"] as Array<String>;
    for (var i = 0; i < signals.size(); i++) {
        var levels = (last != null) ? last[signals[i]] : null;
        var detail = (levels instanceof Array) ? ShiftBody.summary(levels as Array<Number?>, signals[i]) : "No shift read yet";
        menu.addItem(new WatchUi.MenuItem(ShiftBody.label(signals[i]), detail, signals[i], null));
    }
    menu.addItem(new WatchUi.ToggleMenuItem("Share with calendar", { :enabled => "Shifts, as words only", :disabled => "Off: shifts aren't read" }, "share", Sharing.isOn(), null));
    WatchUi.pushView(menu, new BodyMenuDelegate(model), WatchUi.SLIDE_UP);
}

class BodyMenuDelegate extends WatchUi.Menu2InputDelegate {
    private var _model as OffshiftModel;

    function initialize(model as OffshiftModel) {
        Menu2InputDelegate.initialize();
        _model = model;
    }

    function onSelect(item as MenuItem) as Void {
        var id = item.getId() as String;
        if ("share".equals(id)) {
            _model.setSharing((item as ToggleMenuItem).isEnabled());
            return;
        }
        _model.note(ShiftBody.source(id));
    }

    function onBack() as Void {
        WatchUi.popView(WatchUi.SLIDE_DOWN);
    }
}

//! The first-run question. No means the readings stay on the watch.
class ConsentDelegate extends WatchUi.ConfirmationDelegate {
    private var _model as OffshiftModel;

    function initialize(model as OffshiftModel) {
        ConfirmationDelegate.initialize();
        _model = model;
    }

    function onResponse(response as Confirm) as Boolean {
        _model.setSharing(response == WatchUi.CONFIRM_YES);
        return true;
    }
}
