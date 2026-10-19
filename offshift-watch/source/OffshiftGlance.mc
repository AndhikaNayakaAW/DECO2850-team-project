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
        var font = Graphics.FONT_XTINY;
        var lineHeight = dc.getFontHeight(font);
        var width = dc.getWidth() - 24;
        var fitted = Graphics.fitTextToArea(text, font, width, lineHeight * 1.5, true);
        dc.setColor(Palette.INK, Palette.CREAM);
        dc.clear();
        dc.drawText(12, h / 4, font, "OFFSHIFT", Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(Palette.STRONG, Graphics.COLOR_TRANSPARENT);
        if (fitted != null) {
            dc.drawText(12, h * 3 / 4, font, fitted, Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
        }
    }
}
