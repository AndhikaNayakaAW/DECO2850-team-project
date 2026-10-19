import Toybox.Lang;

//! The words for each level, the same table the calendar uses, plus the watch's own numbers for the wearer.
module BodyWords {

    function label(signal as String) as String {
        if (signal.equals("pulseOx")) {
            return "Pulse ox";
        }
        if (signal.equals("steps")) {
            return "Steps";
        }
        return signal.substring(0, 1).toUpper() + signal.substring(1, signal.length());
    }

    function word(signal as String, level as Number?) as String {
        if (level == null) {
            return "No reading";
        }
        return words(signal)[level];
    }

    function words(signal as String) as Array<String> {
        if (signal.equals("energy")) {
            return ["Very low", "Running low", "Steady", "Plenty"];
        }
        if (signal.equals("sleep")) {
            return ["Very poor", "Poor", "Fair", "Good"];
        }
        if (signal.equals("stress")) {
            return ["High", "Medium", "Low", "Resting"];
        }
        if (signal.equals("heart")) {
            return ["Well above usual", "Above usual", "Slightly above usual", "As usual"];
        }
        if (signal.equals("breathing")) {
            return ["Very fast", "Fast", "Steady", "Calm"];
        }
        if (signal.equals("pulseOx")) {
            return ["Very low", "Low", "Slightly low", "Good"];
        }
        return ["Long way off", "Still recovering", "Recovering", "Recovered"];
    }

    //! The word with the number behind it, for the wearer's eyes only.
    function detail(signal as String, r as Dictionary<String, Number or Null>, levels as Dictionary<String, Number or Null>) as String {
        if (signal.equals("steps")) {
            var steps = r["steps"];
            return (steps != null) ? steps.toString() + " today" : "No reading";
        }
        var level = levels[signal];
        if (signal.equals("heart") && level == null) {
            var now = r["heartRate"];
            return (now != null) ? now.toString() + " bpm now" : "No reading";
        }
        if (level == null) {
            return "No reading";
        }
        var w = word(signal, level);
        if (signal.equals("energy")) {
            return w + " (" + num(r["battery"]) + ")";
        }
        if (signal.equals("sleep")) {
            return w + " (+" + num(r["recharge"]) + " overnight)";
        }
        if (signal.equals("stress")) {
            return w + " (" + num(r["stress"]) + ")";
        }
        if (signal.equals("heart")) {
            return w + " (" + num(r["resting"]) + " bpm)";
        }
        if (signal.equals("breathing")) {
            return w + " (" + num(r["breathing"]) + "/min)";
        }
        if (signal.equals("pulseOx")) {
            return w + " (" + num(r["pulseOx"]) + "%)";
        }
        var hours = r["recovery"];
        return (hours == null || hours == 0) ? w : w + " (" + hours.toString() + " h)";
    }

    //! Where a reading comes from, shown when the wearer picks it.
    function source(signal as String, r as Dictionary<String, Number or Null>) as String {
        if (signal.equals("energy")) {
            return "Garmin Body Battery";
        }
        if (signal.equals("sleep")) {
            return "Body Battery regained last night";
        }
        if (signal.equals("stress")) {
            return "Average of the last 3 hours";
        }
        if (signal.equals("heart")) {
            var usual = r["restingUsual"];
            return (usual != null && r["resting"] != null) ? "Lowest half hour last night. Usually " + usual.toString() : "Latest heart rate";
        }
        if (signal.equals("breathing")) {
            return "Breaths a minute, latest";
        }
        if (signal.equals("pulseOx")) {
            return "Latest Pulse Ox reading";
        }
        if (signal.equals("recovery")) {
            return "Garmin recovery time";
        }
        var week = r["intensity"];
        return (week != null) ? week.toString() + " intensity min this week" : "Steps since midnight";
    }

    //! Dark semantic inks remain readable against the calendar's cream background.
    function colour(level as Number?) as Number {
        if (level == null) {
            return Palette.MUTED;
        }
        return (level == 0) ? Palette.ALERT_INK : (level == 1) ? Palette.WARM_INK : Palette.STRONG;
    }

    //! The overall word's colour, as on the calendar: Body Battery sets it, and a steady signal reading low makes it at least mustard.
    function tone(levels as Dictionary<String, Number or Null>) as Number {
        var overall = Health.overall(levels);
        if (overall == null) {
            return Palette.MUTED;
        }
        if (overall <= 1) {
            return (overall == 0) ? Palette.ALERT_INK : Palette.WARM_INK;
        }
        var steady = ["sleep", "stress", "heart", "recovery"] as Array<String>;
        for (var i = 0; i < steady.size(); i++) {
            var v = levels[steady[i]];
            if (v != null && v <= 1) {
                return Palette.WARM_INK;
            }
        }
        return Palette.INK;
    }

    function num(v as Number?) as String {
        return (v != null) ? v.toString() : "-";
    }
}
