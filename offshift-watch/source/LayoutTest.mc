import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Test;

//! Every page is laid out off-screen with the watch's own fonts: nothing may overlap,
//! run past the round edge, or fail to fit.

(:test)
function everyPageFitsWithAnAsk(logger as Test.Logger) as Boolean {
    return pagesFit(logger, ask(false), allLevels());
}

(:test)
function everyPageFitsWhileDecidingLater(logger as Test.Logger) as Boolean {
    return pagesFit(logger, ask(true), allLevels());
}

(:test)
function everyPageFitsWithNothingWaiting(logger as Test.Logger) as Boolean {
    var summary = {
        "ask" => null,
        "waiting" => 0,
        "today" => ["1pm Tute - INFS2200", "7:30pm Dinner with Ayu"],
        "replied" => { "from" => "Jess", "time" => "4-9 pm", "status" => "Another time offered" }
    };
    return pagesFit(logger, summary, {} as Dictionary<String, Number or Null>);
}

(:test)
function everyPageFitsBeforeTheCalendarAnswers(logger as Test.Logger) as Boolean {
    return pagesFit(logger, null, {} as Dictionary<String, Number or Null>);
}

(:test)
function longWordsWrapInsteadOfSpilling(logger as Test.Logger) as Boolean {
    return pagesFit(logger, longAsk(), allLevels());
}

function longAsk() as Dictionary {
    var summary = ask(true);
    var a = summary["ask"] as Dictionary;
    // the longest the server really sends: a day name for "when", a time with minutes on both ends
    a["from"] = "Alexandria";
    a["employer"] = "McDonald's";
    a["when"] = "Wednesday";
    a["time"] = "10:30 am - 12:45 pm";
    a["week"] = ["7:30pm clash: Group meeting DECO2850 studio", "Arrive late from Lecture INFS2200 11am", "Thu starts 9am"];
    return summary;
}

function ask(deferred as Boolean) as Dictionary {
    return {
        "ask" => {
            "id" => "o-jess-thu", "from" => "Jess", "employer" => "Pandora", "when" => "tonight", "time" => "4-9 pm",
            "week" => ["7:30pm clash: Dinner with Ayu", "25 min spare after Tute 3pm", "Fri starts 10am"],
            "status" => deferred ? "deferred" : "pending", "reminder" => deferred ? "1:32 pm" : null
        },
        "waiting" => 1,
        "today" => ["1pm Tute - INFS2200", "7:30pm Dinner with Ayu"],
        "replied" => null
    };
}

function allLevels() as Dictionary<String, Number or Null> {
    return { "energy" => 1, "sleep" => 0, "stress" => 1, "heart" => 1, "breathing" => 2, "pulseOx" => 3, "recovery" => 1 } as Dictionary<String, Number or Null>;
}

function pagesFit(logger as Test.Logger, summary as Dictionary?, levels as Dictionary<String, Number or Null>) as Boolean {
    var model = new OffshiftModel(new OffshiftApi());
    model.show(summary, levels);
    var bitmap = Graphics.createBufferedBitmap({ :width => 454, :height => 454, :palette => [Graphics.COLOR_BLACK, Graphics.COLOR_WHITE] }).get() as Graphics.BufferedBitmap;
    var dc = bitmap.getDc();
    logger.debug("fonts xtiny " + dc.getFontHeight(Graphics.FONT_XTINY) + ", tiny " + dc.getFontHeight(Graphics.FONT_TINY) + ", small " + dc.getFontHeight(Graphics.FONT_SMALL) + ", medium " + dc.getFontHeight(Graphics.FONT_MEDIUM) + ", large " + dc.getFontHeight(Graphics.FONT_LARGE));
    var ok = true;
    for (var i = 0; i < 4; i++) {
        var page = Pages.make(model, i);
        var rows = page.layout(dc);
        var found = Layout.problems(dc, rows);
        for (var k = 0; k < rows.size(); k++) {
            var fitted = rows[k].fitted;
            if (fitted != null && (fitted as String).find("…") != null && Layout.lineCount(fitted as String) < rows[k].maxLines) {
                found += " [" + rows[k].text + "] was cut short with room to wrap;";
            }
            if (rows[k].smaller != null && rows[k].cut()) {
                found += " [" + rows[k].text + "] was cut short even at the smallest size;";
            }
        }
        if (found.length() > 0) {
            logger.error(page.title() + ":" + found);
            ok = false;
        }
    }
    return ok;
}

//! Logs where every line lands, so the pages can be redrawn and looked at off the watch.
(:test)
function dumpPagesForReview(logger as Test.Logger) as Boolean {
    var cases = [ask(false), longAsk(), { "ask" => null, "waiting" => 0, "today" => ["1pm Tute - INFS2200", "7:30pm Dinner with Ayu"], "replied" => { "from" => "Jess", "time" => "4-9 pm", "status" => "Declined" } }] as Array<Dictionary>;
    var bitmap = Graphics.createBufferedBitmap({ :width => 454, :height => 454, :palette => [Graphics.COLOR_BLACK, Graphics.COLOR_WHITE] }).get() as Graphics.BufferedBitmap;
    var dc = bitmap.getDc();
    for (var c = 0; c < cases.size(); c++) {
        var model = new OffshiftModel(new OffshiftApi());
        model.show(cases[c], allLevels());
        for (var i = 0; i < 4; i++) {
            var page = Pages.make(model, i);
            var rows = page.layout(dc);
            for (var k = 0; k < rows.size(); k++) {
                var row = rows[k];
                var text = (row.fitted != null) ? row.fitted as String : "";
                var flat = "";
                var rest = text;
                var at = rest.find("\n");
                while (at != null) {
                    flat += rest.substring(0, at) + "~";
                    rest = rest.substring(at + 1, rest.length()) as String;
                    at = rest.find("\n");
                }
                flat += rest;
                logger.debug("ROW|" + c + "|" + i + "|" + (row.font as Number) + "|" + row.y + "|" + row.height + "|" + row.colour.format("%06X") + "|" + flat);
            }
        }
    }
    return true;
}
