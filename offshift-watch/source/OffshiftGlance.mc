import Toybox.Application;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;

//! The glance in the widget loop: the waiting ask in one line, or the body when nothing is waiting.
(:glance)
class OffshiftGlance extends WatchUi.GlanceView {

    function initialize() {
        GlanceView.initialize();
    }

    function onUpdate(dc as Dc) as Void {
        var saved = Application.Storage.getValue("glance");
        var body = Application.Storage.getValue("body");
        var text = (saved instanceof String) ? saved : "Open to check your week";
        if ("Nothing waiting".equals(text) && body instanceof String) {
            text = "Body: " + body.toLower();
        }
        var h = dc.getHeight();
        dc.setColor(0xDAAB56, Graphics.COLOR_TRANSPARENT);
        dc.drawText(0, h / 4, Graphics.FONT_XTINY, "OFFSHIFT", Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(0xF5F2ED, Graphics.COLOR_TRANSPARENT);
        dc.drawText(0, h * 3 / 4, Graphics.FONT_XTINY, text, Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
    }
}
