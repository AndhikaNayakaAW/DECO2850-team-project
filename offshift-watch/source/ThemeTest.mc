import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Math;
import Toybox.Test;

(:test)
function watchUsesCalendarGround(logger as Test.Logger) as Boolean {
    var model = new OffshiftModel(new OffshiftApi());
    for (var i = 0; i < 4; i++) {
        Test.assertEqual(Pages.make(model, i).background(), 0xF5F2ED);
    }
    return true;
}

(:test)
function everyWatchPageIdentifiesOffshift(logger as Test.Logger) as Boolean {
    var model = new OffshiftModel(new OffshiftApi());
    model.show(ask(false), allLevels());
    var bitmap = Graphics.createBufferedBitmap({ :width => 454, :height => 454 }).get() as Graphics.BufferedBitmap;
    for (var i = 0; i < 4; i++) {
        var rows = Pages.make(model, i).layout(bitmap.getDc());
        Test.assertEqual(rows[0].text, "OFFSHIFT");
        Test.assertEqual(rows[1].text, Pages.make(model, i).title());
    }
    return true;
}

//! Pale poster colours are surfaces, not small text on the calendar's cream ground.
(:test)
function watchTextHasReadableContrastOnCream(logger as Test.Logger) as Boolean {
    var model = new OffshiftModel(new OffshiftApi());
    model.show(ask(false), allLevels());
    var bitmap = Graphics.createBufferedBitmap({ :width => 454, :height => 454 }).get() as Graphics.BufferedBitmap;
    for (var i = 0; i < 4; i++) {
        var rows = Pages.make(model, i).layout(bitmap.getDc());
        for (var j = 0; j < rows.size(); j++) {
            Test.assertMessage(contrastOnCream(rows[j].colour) >= 4.5, rows[j].text + " needs 4.5:1 contrast");
        }
    }
    for (var level = 0; level < 4; level++) {
        Test.assert(contrastOnCream(BodyWords.colour(level)) >= 4.5);
    }
    Test.assert(contrastOnCream(BodyWords.colour(null)) >= 4.5);
    return true;
}

function linearChannel(channel as Number) as Float {
    var value = channel / 255.0;
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function luminance(colour as Number) as Float {
    return 0.2126 * linearChannel((colour >> 16) & 255) + 0.7152 * linearChannel((colour >> 8) & 255) + 0.0722 * linearChannel(colour & 255);
}

function contrastOnCream(colour as Number) as Float {
    return (luminance(0xF5F2ED) + 0.05) / (luminance(colour) + 0.05);
}
