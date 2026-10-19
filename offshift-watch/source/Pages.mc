import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;

//! Four pages, scrolled with Up and Down or a swipe: the ask, the week around it, your body,
//! and the link to the calendar. Each page holds one idea.
class OffshiftPages extends WatchUi.ViewLoopFactory {
    private var _model as OffshiftModel;

    function initialize(model as OffshiftModel) {
        ViewLoopFactory.initialize();
        _model = model;
    }

    function getSize() as Number {
        return 4;
    }

    function getView(page as Number) as [ViewLoopFactory.Views] or [ViewLoopFactory.Views, ViewLoopFactory.Delegates] {
        return [Pages.make(_model, page), new PageDelegate(_model, page)];
    }
}

module Pages {
    const ASK = 0;
    const WEEK = 1;
    const BODY = 2;
    const CALENDAR = 3;

    function make(model as OffshiftModel, page as Number) as Page {
        if (page == ASK) {
            return new AskPage(model);
        }
        if (page == WEEK) {
            return new WeekPage(model);
        }
        if (page == BODY) {
            return new BodyPage(model);
        }
        return new CalendarPage(model);
    }
}

//! A small title at the top, rows centred in the middle, and a hint at the bottom.
class Page extends WatchUi.View {
    protected var _model as OffshiftModel;

    function initialize(model as OffshiftModel) {
        View.initialize();
        _model = model;
    }

    function title() as String {
        return "";
    }

    function rows() as Array<Row> {
        return [] as Array<Row>;
    }

    function hint() as String? {
        return null;
    }

    //! Pages that may leave out their last rows rather than overflow.
    function trims() as Boolean {
        return false;
    }

    function onUpdate(dc as Dc) as Void {
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();
        Layout.draw(dc, layout(dc));
    }

    function layout(dc as Dc) as Array<Row> {
        var h = dc.getHeight();
        var small = dc.getFontHeight(Graphics.FONT_XTINY);
        var head = new Row(title(), Graphics.FONT_XTINY, Palette.MUSTARD, 1, 0);
        var all = [head] as Array<Row>;
        Layout.arrange(dc, all, (h * 0.11).toNumber(), (h * 0.11).toNumber() + small);
        var bottom = (h * 0.84).toNumber();
        var hintText = hint();
        var tail = null as Row?;
        if (hintText != null) {
            tail = new Row(hintText, Graphics.FONT_XTINY, Palette.MUTED, 1, 0);
            Layout.arrange(dc, [tail] as Array<Row>, (h * 0.79).toNumber(), (h * 0.79).toNumber() + small);
            bottom = tail.y - 12;
        }
        var body = rows();
        var top = head.y + head.height + 16;
        Layout.arrange(dc, body, top, bottom);
        while (trims() && body.size() > 1 && body[body.size() - 1].y + body[body.size() - 1].height > bottom) {
            body = body.slice(0, body.size() - 1);
            Layout.arrange(dc, body, top, bottom);
        }
        all.addAll(body);
        if (tail != null) {
            all.add(tail);
        }
        return all;
    }

    function line(text as String, font as Graphics.FontDefinition, colour as Number, maxLines as Number, gap as Number) as Row {
        return new Row(text, font, colour, maxLines, gap);
    }
}

//! Who is asking, what, and when. Nothing else.
class AskPage extends Page {
    function initialize(model as OffshiftModel) {
        Page.initialize(model);
    }

    function title() as String {
        return "ASK";
    }

    function rows() as Array<Row> {
        var ask = _model.ask();
        if (ask != null) {
            return [
                line((ask["from"] as String) + " - " + (ask["employer"] as String), Graphics.FONT_TINY, Palette.SAGE, 2, 10).orSmaller([Graphics.FONT_XTINY]),
                line("Cover " + (ask["when"] as String) + "?", Graphics.FONT_MEDIUM, Palette.CREAM, 2, 4).orSmaller([Graphics.FONT_SMALL]),
                line(ask["time"] as String, Graphics.FONT_LARGE, Palette.MUSTARD, 2, 0).orSmaller([Graphics.FONT_MEDIUM, Graphics.FONT_SMALL, Graphics.FONT_TINY])
            ] as Array<Row>;
        }
        var summary = _model.summary();
        if (summary == null) {
            return [line(_model.status(), Graphics.FONT_SMALL, Palette.CREAM, 2, 0)] as Array<Row>;
        }
        var rows = [line("Nothing waiting", Graphics.FONT_MEDIUM, Palette.CREAM, 1, 10)] as Array<Row>;
        var replied = summary["replied"];
        if (replied instanceof Dictionary) {
            rows.add(line((replied["from"] as String) + ", " + (replied["time"] as String) + ": " + (replied["status"] as String), Graphics.FONT_TINY, Palette.SAGE, 2, 0));
        }
        return rows;
    }

    //! While deciding later, the reminder takes the hint's place; pressing still answers.
    function hint() as String? {
        var ask = _model.ask();
        if (ask == null) {
            return null;
        }
        return "deferred".equals(ask["status"]) ? "Reminder " + (ask["reminder"] as String) : "Press to answer";
    }

}

//! The week around the ask: clashes, the trip there, tomorrow's start. Today's plans when nothing is waiting.
class WeekPage extends Page {

    function initialize(model as OffshiftModel) {
        Page.initialize(model);
    }

    function title() as String {
        return (_model.ask() != null) ? "AROUND IT" : "TODAY";
    }

    function rows() as Array<Row> {
        var ask = _model.ask();
        var summary = _model.summary();
        var source = (ask != null) ? ask["week"] : (summary != null ? summary["today"] : null);
        var rows = [] as Array<Row>;
        if (source instanceof Array) {
            for (var i = 0; i < source.size() && i < (ask != null ? 3 : 4); i++) {
                rows.add(line(source[i] as String, Graphics.FONT_TINY, Palette.POWDER, 2, ask != null ? 12 : 8));
            }
        }
        if (rows.size() == 0) {
            rows.add(line(ask != null ? "Nothing else around it" : "Nothing else today", Graphics.FONT_SMALL, Palette.CREAM, 2, 0));
        }
        return rows;
    }

    function trims() as Boolean {
        return true;
    }
}

//! The body in one word, then sleep, stress and heart. Press for every reading and the sharing switch.
class BodyPage extends Page {
    private const SHOWN = ["sleep", "stress", "heart"] as Array<String>;

    function initialize(model as OffshiftModel) {
        Page.initialize(model);
    }

    function title() as String {
        return "BODY";
    }

    function rows() as Array<Row> {
        var levels = _model.levels();
        var overall = Health.overall(levels);
        var rows = [line(Health.overallWord(overall), Graphics.FONT_MEDIUM, BodyWords.tone(levels), 1, 12)] as Array<Row>;
        for (var i = 0; i < SHOWN.size(); i++) {
            var level = levels[SHOWN[i]];
            rows.add(line(BodyWords.label(SHOWN[i]) + ": " + BodyWords.word(SHOWN[i], level).toLower(), Graphics.FONT_TINY, BodyWords.colour(level), 1, 4));
        }
        return rows;
    }

    function hint() as String? {
        return "Press for details";
    }
}

//! How the watch and the calendar are linked: when they last spoke, and what the watch shares.
class CalendarPage extends Page {

    function initialize(model as OffshiftModel) {
        Page.initialize(model);
    }

    function title() as String {
        return "CALENDAR";
    }

    function rows() as Array<Row> {
        var rows = [] as Array<Row>;
        var synced = _model.syncedAt();
        if (_model.status().length() == 0 && synced != null) {
            rows.add(line("Synced " + synced, Graphics.FONT_SMALL, Palette.CREAM, 1, 12));
        } else {
            rows.add(line(_model.status(), Graphics.FONT_SMALL, Palette.CORAL, 2, 12));
        }
        var summary = _model.summary();
        var waiting = (summary != null) ? summary["waiting"] : null;
        if (waiting instanceof Number) {
            rows.add(line(waiting == 0 ? "Nothing waiting" : waiting.toString() + (waiting == 1 ? " ask waiting" : " asks waiting"), Graphics.FONT_TINY, Palette.SAGE, 1, 6));
        }
        rows.add(line(Sharing.isOn() ? "Body: words only" : "Body stays on watch", Graphics.FONT_TINY, Palette.POWDER, 1, 0));
        return rows;
    }

    function hint() as String? {
        return "Press for sharing";
    }
}

//! Select answers the ask on the first two pages and opens the body details on the last two.
class PageDelegate extends WatchUi.BehaviorDelegate {
    private var _model as OffshiftModel;
    private var _page as Number;

    function initialize(model as OffshiftModel, page as Number) {
        BehaviorDelegate.initialize();
        _model = model;
        _page = page;
    }

    function onSelect() as Boolean {
        var ask = _model.ask();
        if (_page <= Pages.WEEK) {
            if (ask != null) {
                pushAnswerMenu(_model, ask);
            }
            return true;
        }
        pushBodyMenu(_model);
        return true;
    }

    function onMenu() as Boolean {
        pushBodyMenu(_model);
        return true;
    }
}
