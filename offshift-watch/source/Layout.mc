import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Math;
import Toybox.System;

//! One block of text on a page, wrapped to at most maxLines lines.
class Row {
    var text as String;
    var font as Graphics.FontType;
    var colour as Number;
    var maxLines as Number;
    var gap as Number;
    var fitted as String?;
    var y as Number = 0;
    var height as Number = 0;
    //! Smaller fonts to step down to before the text would be cut short.
    var smaller as Array<Graphics.FontType>?;

    function initialize(text as String, font as Graphics.FontType, colour as Number, maxLines as Number, gap as Number) {
        self.text = text;
        self.font = font;
        self.colour = colour;
        self.maxLines = maxLines;
        self.gap = gap;
    }

    //! How many of the smaller fonts have been used.
    var step as Number = 0;

    function orSmaller(fonts as Array<Graphics.FontType>) as Row {
        smaller = fonts;
        return self;
    }

    function canShrink() as Boolean {
        return smaller != null && step < (smaller as Array<Graphics.FontType>).size();
    }

    function shrink() as Void {
        font = (smaller as Array<Graphics.FontType>)[step];
        step += 1;
    }

    function cut() as Boolean {
        return fitted != null && (fitted as String).find("…") != null;
    }
}

//! Places rows on the round screen: centred between a top and a bottom, each wrapped to the
//! width of the circle where it sits, so nothing runs off the edge or over the next line.
module Layout {

    function arrange(dc as Dc, rows as Array<Row>, top as Number, bottom as Number) as Void {
        place(dc, rows, top, bottom);
        // Too tall for the page: step the tallest row that can shrink down a size, and place again.
        while (overflows(rows, bottom)) {
            var pick = null as Row?;
            for (var i = 0; i < rows.size(); i++) {
                if (rows[i].canShrink() && (pick == null || rows[i].height > pick.height)) {
                    pick = rows[i];
                }
            }
            if (pick == null) {
                break;
            }
            pick.shrink();
            place(dc, rows, top, bottom);
        }
    }

    //! The stack runs past the bottom, or a row found no room at all.
    function overflows(rows as Array<Row>, bottom as Number) as Boolean {
        for (var i = 0; i < rows.size(); i++) {
            if (rows[i].fitted == null && rows[i].text.length() > 0) {
                return true;
            }
        }
        return rows.size() > 0 && rows[rows.size() - 1].y + rows[rows.size() - 1].height > bottom;
    }

    //! Wraps every row to the circle where it sits (twice, since wrapping moves rows), stepping a row
    //! down a size whenever its text would otherwise be cut short, then centres the stack.
    function place(dc as Dc, rows as Array<Row>, top as Number, bottom as Number) as Void {
        var w = dc.getWidth();
        for (var pass = 0; pass < 2; pass++) {
            var total = 0;
            for (var i = 0; i < rows.size(); i++) {
                var row = rows[i];
                var width = (pass == 0) ? w - 72 : chord(dc, row.y, row.y + row.height);
                fit(dc, row, width);
                while (row.cut() && row.canShrink()) {
                    row.shrink();
                    fit(dc, row, width);
                }
                row.height = (row.fitted != null) ? lineCount(row.fitted as String) * dc.getFontHeight(row.font) : 0;
                total += row.height + ((i < rows.size() - 1) ? row.gap : 0);
            }
            var y = top + (bottom - top - total) / 2;
            if (y < top) {
                y = top;
            }
            for (var i = 0; i < rows.size(); i++) {
                rows[i].y = y;
                y += rows[i].height + rows[i].gap;
            }
        }
    }

    //! Half a line of slack: the fitter wants a little more than whole line heights before it wraps.
    function fit(dc as Dc, row as Row, width as Number) as Void {
        var fh = dc.getFontHeight(row.font);
        row.fitted = (width > 40) ? Graphics.fitTextToArea(row.text, row.font, width, row.maxLines * fh + fh / 2, true) : null;
    }

    function draw(dc as Dc, rows as Array<Row>) as Void {
        for (var i = 0; i < rows.size(); i++) {
            var row = rows[i];
            if (row.fitted != null) {
                dc.setColor(row.colour, Graphics.COLOR_TRANSPARENT);
                dc.drawText(dc.getWidth() / 2, row.y, row.font, row.fitted as String, Graphics.TEXT_JUSTIFY_CENTER);
            }
        }
    }

    //! The usable width across the circle for a band from yTop to yBottom, with a margin.
    function chord(dc as Dc, yTop as Number, yBottom as Number) as Number {
        var r = dc.getWidth() / 2;
        if (System.getDeviceSettings().screenShape != System.SCREEN_SHAPE_ROUND) {
            return dc.getWidth() - 24;
        }
        var cy = dc.getHeight() / 2;
        var a = (yTop - cy).abs();
        var b = (yBottom - cy).abs();
        var dy = (a > b) ? a : b;
        if (dy >= r) {
            return 0;
        }
        return (2 * Math.sqrt(r * r - dy * dy)).toNumber() - 36;
    }

    function lineCount(text as String) as Number {
        var n = 1;
        var rest = text;
        var i = rest.find("\n");
        while (i != null) {
            n += 1;
            rest = rest.substring(i + 1, rest.length()) as String;
            i = rest.find("\n");
        }
        return n;
    }

    //! What's wrong with a laid-out page: rows that overlap, leave the circle, or don't fit at all. Empty when it's clean.
    function problems(dc as Dc, rows as Array<Row>) as String {
        var cx = dc.getWidth() / 2;
        var cy = dc.getHeight() / 2;
        var r = dc.getWidth() / 2;
        var found = "";
        for (var i = 0; i < rows.size(); i++) {
            var a = rows[i];
            if (a.fitted == null) {
                if (a.text.length() > 0) {
                    found += " [" + a.text + "] did not fit;";
                }
                continue;
            }
            var half = widest(dc, a) / 2;
            var corners = [[cx - half, a.y], [cx + half, a.y], [cx - half, a.y + a.height], [cx + half, a.y + a.height]];
            for (var k = 0; k < corners.size(); k++) {
                var dx = corners[k][0] - cx;
                var dy = corners[k][1] - cy;
                if (dx * dx + dy * dy > (r - 4) * (r - 4)) {
                    found += " [" + a.text + "] leaves the circle;";
                    break;
                }
            }
            for (var j = i + 1; j < rows.size(); j++) {
                var b = rows[j];
                if (b.fitted != null && a.y < b.y + b.height && b.y < a.y + a.height) {
                    found += " [" + a.text + "] overlaps [" + b.text + "];";
                }
            }
        }
        return found;
    }

    function widest(dc as Dc, row as Row) as Number {
        var best = 0;
        var rest = row.fitted as String;
        while (true) {
            var i = rest.find("\n");
            var piece = (i != null) ? rest.substring(0, i) as String : rest;
            var width = dc.getTextWidthInPixels(piece, row.font);
            if (width > best) {
                best = width;
            }
            if (i == null) {
                break;
            }
            rest = rest.substring(i + 1, rest.length()) as String;
        }
        return best;
    }
}

//! The time on the watch, the way the wearer has it set.
module Clock {

    function now() as String {
        var t = System.getClockTime();
        if (System.getDeviceSettings().is24Hour) {
            return t.hour.format("%02d") + ":" + t.min.format("%02d");
        }
        var h = t.hour % 12;
        return (h == 0 ? 12 : h).toString() + ":" + t.min.format("%02d") + (t.hour < 12 ? " am" : " pm");
    }
}
