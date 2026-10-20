import Toybox.ActivityMonitor;
import Toybox.Application;
import Toybox.Lang;
import Toybox.SensorHistory;
import Toybox.System;
import Toybox.Time;
import Toybox.UserProfile;

//! The body as the watch reads it. The numbers stay on the wrist. The calendar only ever
//! receives a level from 0 (low) to 3 for each signal, and only after the worker says yes.
(:background)
module Health {

    //! Every signal the calendar understands, in the order both list them.
    const SIGNALS = ["energy", "sleep", "stress", "heart", "breathing", "pulseOx", "recovery"] as Array<String>;

    //! Everything the watch has right now. Any reading may be null.
    function read() as Dictionary<String, Number or Null> {
        var info = ActivityMonitor.getInfo();
        var profile = UserProfile.getProfile();
        var night = lastNight();
        var r = {
            "battery" => bodyBattery(),
            "recharge" => night["recharge"],
            "stress" => stressAverage(),
            "heartRate" => heartNow(),
            "resting" => night["resting"],
            "restingUsual" => (profile has :averageRestingHeartRate) ? positive(profile.averageRestingHeartRate) : null,
            "breathing" => (info has :respirationRate) ? positive(info.respirationRate) : null,
            "pulseOx" => pulseOx(),
            "recovery" => (info has :timeToRecovery) ? info.timeToRecovery : null,
            "steps" => info.steps,
            "intensity" => intensity(info)
        } as Dictionary<String, Number or Null>;
        if (r["stress"] == null && (info has :stressScore)) {
            r["stress"] = info.stressScore;
        }
        return r;
    }

    //! A level from 0 to 3 for each signal, or null where the watch has no reading.
    function levels(r as Dictionary<String, Number or Null>) as Dictionary<String, Number or Null> {
        return {
            "energy" => energyLevel(r["battery"]),
            "sleep" => sleepLevel(r["recharge"]),
            "stress" => stressLevel(r["stress"]),
            "heart" => heartLevel(r["resting"], r["restingUsual"]),
            "breathing" => breathingLevel(r["breathing"]),
            "pulseOx" => pulseOxLevel(r["pulseOx"]),
            "recovery" => recoveryLevel(r["recovery"])
        } as Dictionary<String, Number or Null>;
    }

    //! No upload without a reading: a clock alone is not a health measurement.
    function payload(levels as Dictionary<String, Number or Null>) as Dictionary<String, Number or String>? {
        var out = {} as Dictionary<String, Number or String>;
        for (var i = 0; i < SIGNALS.size(); i++) {
            var v = levels[SIGNALS[i]];
            if (v != null) {
                out[SIGNALS[i]] = v;
            }
        }
        if (out.size() == 0) {
            return null;
        }
        var t = System.getClockTime();
        out["at"] = t.hour.format("%02d") + ":" + t.min.format("%02d");
        return out;
    }

    //! A short fingerprint of the levels, so the app only resends when something changed.
    function key(levels as Dictionary<String, Number or Null>) as String {
        var s = "";
        for (var i = 0; i < SIGNALS.size(); i++) {
            var v = levels[SIGNALS[i]];
            s += (v != null) ? v.toString() : "-";
        }
        return s;
    }

    //! Overall: Body Battery, which Garmin already builds from sleep, stress, heart-rate variability
    //! and activity. Without it the watch isn't being worn, so there is no overall reading.
    function overall(levels as Dictionary<String, Number or Null>) as Number? {
        return levels["energy"];
    }

    function overallWord(level as Number?) as String {
        if (level == null) {
            return "No reading";
        }
        return ["Very low", "Running low", "Steady", "Plenty of energy"][level] as String;
    }

    /* ---------- levels, using Garmin's own bands where Garmin publishes them ---------- */

    function energyLevel(battery as Number?) as Number? {
        if (battery == null) {
            return null;
        }
        return band(battery, 70, 40, 20);
    }

    //! Sleep, from how much Body Battery came back last night. Garmin keeps its sleep score for watch faces only.
    function sleepLevel(recharge as Number?) as Number? {
        if (recharge == null) {
            return null;
        }
        return band(recharge, 50, 30, 15);
    }

    //! Garmin's stress bands: resting 0-25, low 26-50, medium 51-75, high 76-100.
    function stressLevel(stress as Number?) as Number? {
        if (stress == null || stress < 0) {
            return null;
        }
        if (stress <= 25) {
            return 3;
        }
        if (stress <= 50) {
            return 2;
        }
        if (stress <= 75) {
            return 1;
        }
        return 0;
    }

    //! Last night's resting heart rate against the watch's own seven-day average.
    function heartLevel(resting as Number?, usual as Number?) as Number? {
        if (resting == null || usual == null) {
            return null;
        }
        var above = resting - usual;
        if (above <= 2) {
            return 3;
        }
        if (above <= 5) {
            return 2;
        }
        if (above <= 9) {
            return 1;
        }
        return 0;
    }

    function breathingLevel(perMinute as Number?) as Number? {
        if (perMinute == null) {
            return null;
        }
        if (perMinute <= 16) {
            return 3;
        }
        if (perMinute <= 20) {
            return 2;
        }
        if (perMinute <= 25) {
            return 1;
        }
        return 0;
    }

    function pulseOxLevel(percent as Number?) as Number? {
        if (percent == null) {
            return null;
        }
        return band(percent, 95, 90, 85);
    }

    //! Garmin's recovery time after the last workout, in hours.
    function recoveryLevel(hours as Number?) as Number? {
        if (hours == null || hours < 0) {
            return null;
        }
        if (hours == 0) {
            return 3;
        }
        if (hours <= 24) {
            return 2;
        }
        if (hours <= 48) {
            return 1;
        }
        return 0;
    }

    //! 3 at or above high, 2 at or above mid, 1 at or above low, otherwise 0.
    function band(value as Number, high as Number, mid as Number, low as Number) as Number {
        if (value >= high) {
            return 3;
        }
        if (value >= mid) {
            return 2;
        }
        if (value >= low) {
            return 1;
        }
        return 0;
    }

    /* ---------- reading the watch ---------- */

    //! Blank samples happen while the watch is off the wrist or on its cable, so every reader
    //! looks back for the most recent real one instead of trusting the newest entry.
    function bodyBattery() as Number? {
        if ((Toybox has :SensorHistory) && (SensorHistory has :getBodyBatteryHistory)) {
            return latest(SensorHistory.getBodyBatteryHistory({ :period => new Time.Duration(4 * 3600), :order => SensorHistory.ORDER_NEWEST_FIRST }), 0, 100);
        }
        return null;
    }

    function heartNow() as Number? {
        if ((Toybox has :SensorHistory) && (SensorHistory has :getHeartRateHistory)) {
            return latest(SensorHistory.getHeartRateHistory({ :period => new Time.Duration(3600), :order => SensorHistory.ORDER_NEWEST_FIRST }), 30, 220);
        }
        return null;
    }

    //! Pulse Ox is measured now and then (spot checks, or during sleep), so look back a whole day.
    function pulseOx() as Number? {
        if ((Toybox has :SensorHistory) && (SensorHistory has :getOxygenSaturationHistory)) {
            return latest(SensorHistory.getOxygenSaturationHistory({ :period => new Time.Duration(24 * 3600), :order => SensorHistory.ORDER_NEWEST_FIRST }), 70, 100);
        }
        return null;
    }

    //! Average stress over the last three hours, ignoring moments the watch could not measure.
    function stressAverage() as Number? {
        if (!((Toybox has :SensorHistory) && (SensorHistory has :getStressHistory))) {
            return null;
        }
        var history = SensorHistory.getStressHistory({ :period => new Time.Duration(3 * 3600), :order => SensorHistory.ORDER_NEWEST_FIRST });
        var sum = 0;
        var count = 0;
        var sample = history.next();
        while (sample != null) {
            var d = sample.data;
            if (d != null && d >= 0 && d <= 100) {
                sum += d.toNumber();
                count += 1;
            }
            sample = history.next();
        }
        return (count > 0) ? sum / count : null;
    }

    //! Last night as the watch saw it, from 10 pm to an hour after the usual wake time: how much
    //! Body Battery came back, and the lowest half-hour heart rate (Garmin's own resting rate).
    //! Worked out once a day after the night is over and remembered, and only when the watch still
    //! holds the night from before 3 am. A guess about someone's night is worse than no reading.
    function lastNight() as Dictionary<String, Number or Null> {
        var day = Time.today().value();
        var saved = Application.Storage.getValue("night");
        if (saved instanceof Dictionary && saved["day"] == day) {
            return { "recharge" => saved["recharge"] as Number?, "resting" => saved["resting"] as Number? } as Dictionary<String, Number or Null>;
        }
        var none = { "recharge" => null, "resting" => null } as Dictionary<String, Number or Null>;
        var now = Time.now().value();
        var from = day - 2 * 3600;
        var to = day + wakeSeconds() + 3600;
        if (now < to || !(Toybox has :SensorHistory)) {
            return none;
        }
        var held = day + 3 * 3600;
        var period = new Time.Duration(now - from);
        var recharge = null;
        if (SensorHistory has :getBodyBatteryHistory) {
            var rise = new RiseTracker();
            var first = scanNight(SensorHistory.getBodyBatteryHistory({ :period => period, :order => SensorHistory.ORDER_OLDEST_FIRST }), from, to, rise, null);
            recharge = (first != null && first <= held) ? rise.best() : null;
        }
        var resting = null;
        if (SensorHistory has :getHeartRateHistory) {
            var half = new HalfHourTracker();
            var first = scanNight(SensorHistory.getHeartRateHistory({ :period => period, :order => SensorHistory.ORDER_OLDEST_FIRST }), from, to, null, half);
            resting = (first != null && first <= held) ? half.lowest() : null;
        }
        var night = { "recharge" => recharge, "resting" => resting } as Dictionary<String, Number or Null>;
        Application.Storage.setValue("night", { "day" => day, "recharge" => recharge, "resting" => resting });
        return night;
    }

    //! Feeds the night's real samples to a tracker and returns when the first one was taken.
    function scanNight(history as SensorHistory.SensorHistoryIterator, from as Number, to as Number, rise as RiseTracker?, half as HalfHourTracker?) as Number? {
        var first = null as Number?;
        var sample = history.next();
        while (sample != null) {
            var t = sample.when.value();
            if (t > to) {
                break;
            }
            var d = sample.data;
            if (t >= from && d != null && d > 0 && d < 255) {
                if (first == null) {
                    first = t;
                }
                if (rise != null) {
                    rise.add(d.toNumber());
                }
                if (half != null) {
                    half.add(t, d.toNumber());
                }
            }
            sample = history.next();
        }
        return first;
    }

    function wakeSeconds() as Number {
        var wake = UserProfile.getProfile().wakeTime;
        return (wake != null) ? wake.value() : 7 * 3600;
    }

    function intensity(info as ActivityMonitor.Info) as Number? {
        if (info has :activeMinutesWeek) {
            var week = info.activeMinutesWeek;
            return (week != null) ? week.total : null;
        }
        return null;
    }

    //! The most recent reading inside a plausible range, looking back through newest-first samples.
    function latest(history as SensorHistory.SensorHistoryIterator, low as Number, high as Number) as Number? {
        var sample = history.next();
        var looked = 0;
        while (sample != null && looked < 600) {
            var d = sample.data;
            if (d != null && d >= low && d <= high) {
                return d.toNumber();
            }
            sample = history.next();
            looked += 1;
        }
        return null;
    }

    function positive(value as Number?) as Number? {
        return (value != null && value > 0) ? value : null;
    }
}
