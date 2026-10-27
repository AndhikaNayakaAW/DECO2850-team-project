import Toybox.Lang;
import Toybox.WatchUi;

//! "How was the work?" after a shift: four work words in a fixed order, then Skip.
//! Each word carries its meaning, so the four read as one ladder. Rationale: docs/design/2026-10-23-shift-check-in.md.
function checkInChoices() as Array {
    return [
        ["Light", "Less than usual", "light"],
        ["Steady", "A normal shift", "steady"],
        ["Busy", "Fast, lots to do", "busy"],
        ["Hard", "Asked a lot of you", "hard"],
        ["Skip", "Not this time", "skip"]
    ];
}

//! One press saves it. The calendar is where it can be changed, so no confirmation is needed.
function pushCheckInMenu(model as OffshiftModel, checkIn as Dictionary) as Void {
    var menu = new WatchUi.Menu2({ :theme => WatchUi.MENU_THEME_GREEN, :title => checkIn["title"] as String });
    var choices = checkInChoices();
    for (var i = 0; i < choices.size(); i++) {
        var c = choices[i] as Array;
        menu.addItem(new WatchUi.MenuItem(c[0] as String, c[1] as String, c[2] as String, null));
    }
    WatchUi.pushView(menu, new CheckInDelegate(model, checkIn["id"] as String), WatchUi.SLIDE_UP);
}

//! Holds the id of the shift the question is about, so the word goes to that shift even if a refresh moves on.
class CheckInDelegate extends WatchUi.Menu2InputDelegate {
    private var _model as OffshiftModel;
    private var _shiftId as String;

    function initialize(model as OffshiftModel, shiftId as String) {
        Menu2InputDelegate.initialize();
        _model = model;
        _shiftId = shiftId;
    }

    function onSelect(item as MenuItem) as Void {
        WatchUi.popView(WatchUi.SLIDE_DOWN);
        _model.rate(_shiftId, item.getId() as String);
    }

    //! Backing out is not an answer, so nothing is sent: only Skip says "not this time".
    //! The shift stays rateable on the calendar.
    function onBack() as Void {
        WatchUi.popView(WatchUi.SLIDE_DOWN);
    }
}
