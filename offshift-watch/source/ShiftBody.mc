import Toybox.Application;
import Toybox.Lang;
import Toybox.SensorHistory;
import Toybox.Time;
import Toybox.UserProfile;

//! Heart rate and stress during one shift, read from the watch's own history once the shift is over,
//! 15 minutes at a time. The numbers stay on the wrist: the calendar only ever gets a level from 0 to 3
//! per block, and only while the worker shares. Rationale: docs/design/2026-10-25-biometrics-during-shifts.md.
(:background)
module ShiftBody {
    const BLOCK = 900;
    //! Fewer real samples than this in a quarter hour is no reading, not a guess.
    const ENOUGH = 2;

    //! Garmin's own stress bands, as load: 0 resting (0-25), 1 low (26-50), 2 medium (51-75), 3 high (76-100).
    function stressLoad(stress as Number?) as Number? {
        if (stress == null || stress < 0 || stress > 100) {
            return null;
        }
        if (stress <= 25) {
            return 0;
        }
        if (stress <= 50) {
            return 1;
        }
        if (stress <= 75) {
            return 2;
        }
        return 3;
    }

    //! Heart rate as a share of the worker's heart-rate reserve, between their own resting and maximum rate,
    //! in the bands exercise science uses: 0 very light (under 30%), 1 light (30-39%), 2 moderate (40-59%), 3 vigorous (60% up).
    function heartLoad(bpm as Number?, resting as Number?, max as Number?) as Number? {
        if (bpm == null || resting == null || max == null || max <= resting) {
            return null;
        }
        var share = (bpm - resting) * 100 / (max - resting);
        if (share < 30) {
            return 0;
        }
        if (share < 40) {
            return 1;
        }
        if (share < 60) {
            return 2;
        }
        return 3;
    }

    //! The worker's resting rate: the watch's own seven-day average, or the one they entered.
    function resting() as Number? {
        var profile = UserProfile.getProfile();
        if ((profile has :averageRestingHeartRate) && profile.averageRestingHeartRate != null && profile.averageRestingHeartRate > 0) {
            return profile.averageRestingHeartRate;
        }
        var entered = profile.restingHeartRate;
        return (entered != null && entered > 0) ? entered : null;
    }

    //! The top of the worker's heart-rate zones, which is their maximum rate.
    function maximum() as Number? {
        var zones = UserProfile.getHeartRateZones(UserProfile.HR_ZONE_SPORT_GENERIC);
        if (zones != null && zones.size() > 0) {
            var top = zones[zones.size() - 1];
            if (top != null && top > 0) {
                return top;
            }
        }
        return null;
    }

    //! One average per quarter hour of the shift, from the watch's history. Blank samples (off the wrist,
    //! or moving too much for a stress reading) are skipped, so a gap is no reading rather than a low one.
    function averages(history as SensorHistory.SensorHistoryIterator?, from as Number, to as Number, low as Number, high as Number) as Array<Number?> {
        var blocks = new Blocks(from, to);
        if (history != null) {
            var sample = history.next();
            while (sample != null) {
                var d = sample.data;
                if (d != null && d >= low && d <= high) {
                    blocks.add(sample.when.value(), d.toNumber());
                }
                sample = history.next();
            }
        }
        return blocks.averages(ENOUGH);
    }

    //! The averages as levels, block by block.
    function levels(stress as Array<Number?>, heart as Array<Number?>, resting as Number?, max as Number?) as Dictionary {
        var s = [] as Array<Number?>;
        var h = [] as Array<Number?>;
        for (var i = 0; i < stress.size(); i++) {
            s.add(stressLoad(stress[i]));
            h.add(heartLoad(heart[i], resting, max));
        }
        return { "stress" => s, "heart" => h };
    }

    //! The shift's levels, block by block, read from the watch's own history for exactly the window the calendar named.
    function levelsFor(due as Dictionary) as Dictionary {
        var from = due["from"] as Number;
        var to = due["to"] as Number;
        var stress = null as SensorHistory.SensorHistoryIterator?;
        var heart = null as SensorHistory.SensorHistoryIterator?;
        if (Toybox has :SensorHistory) {
            var period = new Time.Duration(Time.now().value() - from + 60);
            if (SensorHistory has :getStressHistory) {
                stress = SensorHistory.getStressHistory({ :period => period, :order => SensorHistory.ORDER_OLDEST_FIRST });
            }
            if (SensorHistory has :getHeartRateHistory) {
                heart = SensorHistory.getHeartRateHistory({ :period => period, :order => SensorHistory.ORDER_OLDEST_FIRST });
            }
        }
        return levels(averages(stress, from, to, 0, 100), averages(heart, from, to, 30, 220), resting(), maximum());
    }

    //! What the watch sends: the shift, the window it read (so readings never land on a shift whose times changed),
    //! and each signal as text, one character per 15 minutes. A request body can't be relied on to carry lists or nulls.
    function payload(due as Dictionary, l as Dictionary) as Dictionary {
        return { "shiftId" => due["id"], "from" => due["from"], "to" => due["to"], "stress" => wire(l["stress"] as Array<Number?>), "heart" => wire(l["heart"] as Array<Number?>) };
    }

    //! "1-30": a digit 0 to 3 per block, - where the watch had no reading.
    function wire(levels as Array<Number?>) as String {
        var text = "";
        for (var i = 0; i < levels.size(); i++) {
            var v = levels[i];
            text += (v == null) ? "-" : v.toString();
        }
        return text;
    }

    //! Whether the last shift reached the calendar, for the watch's own menu.
    function sendNote() as String {
        var code = Application.Storage.getValue("lastSend");
        if (!(code instanceof Number)) {
            return "Not sent yet";
        }
        return (code == 200) ? "Saved on your calendar" : "Not saved yet (" + code.toString() + ")";
    }

    //! Stored (200), or refused for good (the shift moved, ended differently or is gone): either way this window is done.
    //! An access problem (401, 403) or a failed connection is worth trying again.
    function settled(code as Number) as Boolean {
        return code == 200 || (code >= 400 && code < 500 && code != 401 && code != 403);
    }

    //! Sharing is off, yet the calendar still holds readings: a forget that failed, or a send that crossed it.
    function stillHeld(data as Dictionary) as Boolean {
        var held = data["readings"];
        return !Sharing.isOn() && held instanceof Number && held > 0;
    }

    //! Each shift is read once: the format, its id and the window it ran in, so a shift whose times change is read again,
    //! and so is one that failed under the earlier list format (25 Oct 2026).
    function key(due as Dictionary) as String {
        return "2:" + (due["id"] as String) + "@" + (due["from"] as Number).toString() + "-" + (due["to"] as Number).toString();
    }

    //! Keeps the last shift read for the Last shift page and the glance. It stays on the watch.
    function remember(due as Dictionary, l as Dictionary) as Void {
        Application.Storage.setValue("lastShift", { "title" => due["title"], "stress" => l["stress"], "heart" => l["heart"] });
        Application.Storage.setValue("lastLine", "Last shift: stress " + summary(l["stress"] as Array<Number?>, "stress").toLower());
    }

    function words(signal as String) as Array<String> {
        return "heart".equals(signal) ? ["Very light", "Light", "Moderate", "Vigorous"] as Array<String> : ["Resting", "Low", "Medium", "High"] as Array<String>;
    }

    function label(signal as String) as String {
        return "heart".equals(signal) ? "Heart" : "Stress";
    }

    //! Where a reading comes from, shown when the wearer picks it.
    function source(signal as String) as String {
        return "heart".equals(signal) ? "Heart rate between your resting and maximum" : "Garmin stress, from heart-rate variability while still";
    }

    //! The level most blocks read, the higher one on a tie; null without any reading.
    function mostly(levels as Array<Number?>) as Number? {
        var counts = [0, 0, 0, 0] as Array<Number>;
        var any = false;
        for (var i = 0; i < levels.size(); i++) {
            var v = levels[i];
            if (v != null) {
                counts[v as Number] += 1;
                any = true;
            }
        }
        if (!any) {
            return null;
        }
        var best = 0;
        for (var l = 1; l < 4; l++) {
            if (counts[l] >= counts[best]) {
                best = l;
            }
        }
        return best;
    }

    //! "Mostly low", "Mostly low, high 45 min" or "No reading": how a signal went, short enough for the watch.
    function summary(levels as Array<Number?>, signal as String) as String {
        var usual = mostly(levels);
        if (usual == null) {
            return "No reading";
        }
        var top = 0;
        var topCount = 0;
        for (var i = 0; i < levels.size(); i++) {
            var v = levels[i];
            if (v != null && v > top) {
                top = v;
                topCount = 0;
            }
            if (v != null && v == top) {
                topCount += 1;
            }
        }
        var w = words(signal);
        var text = "Mostly " + w[usual].toLower();
        if (top > usual) {
            text += ", " + w[top].toLower() + " " + (topCount * 15).toString() + " min";
        }
        return text;
    }
}

//! Sums and counts per quarter hour of a shift, for its averages.
(:background)
class Blocks {
    private var _from as Number;
    private var _to as Number;
    private var _sums as Array<Number>;
    private var _counts as Array<Number>;

    function initialize(from as Number, to as Number) {
        _from = from;
        _to = to;
        var n = (to - from + ShiftBody.BLOCK - 1) / ShiftBody.BLOCK;
        if (n < 1) {
            n = 1;
        }
        _sums = new [n] as Array<Number>;
        _counts = new [n] as Array<Number>;
        for (var i = 0; i < n; i++) {
            _sums[i] = 0;
            _counts[i] = 0;
        }
    }

    function count() as Number {
        return _sums.size();
    }

    function add(t as Number, value as Number) as Void {
        if (t < _from || t >= _to) {
            return;
        }
        var i = (t - _from) / ShiftBody.BLOCK;
        _sums[i] += value;
        _counts[i] += 1;
    }

    function averages(enough as Number) as Array<Number?> {
        var out = [] as Array<Number?>;
        for (var i = 0; i < _sums.size(); i++) {
            out.add(_counts[i] >= enough ? _sums[i] / _counts[i] : null);
        }
        return out;
    }
}
