import Toybox.Lang;
import Toybox.WatchUi;

//! Your body: each signal in words with the watch's own number beside it, and the sharing switch.
function pushBodyMenu(model as OffshiftModel) as Void {
    var r = model.readings();
    var levels = model.levels();
    var menu = new WatchUi.Menu2({ :theme => WatchUi.MENU_THEME_GREEN, :title => "Your body" });
    var signals = Health.SIGNALS;
    for (var i = 0; i < signals.size(); i++) {
        menu.addItem(new WatchUi.MenuItem(BodyWords.label(signals[i]), BodyWords.detail(signals[i], r, levels), signals[i], null));
    }
    menu.addItem(new WatchUi.MenuItem("Steps", BodyWords.detail("steps", r, levels), "steps", null));
    menu.addItem(new WatchUi.ToggleMenuItem("Share with calendar", { :enabled => "Words only", :disabled => "Stays on watch" }, "share", Sharing.isOn(), null));
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
        _model.note(BodyWords.source(id, _model.readings()));
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
