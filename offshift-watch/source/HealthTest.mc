import Toybox.Lang;
import Toybox.Test;

//! The watch's levels must match the calendar's words, band for band.

(:test)
function energyFollowsBodyBattery(logger as Test.Logger) as Boolean {
    Test.assertEqual(Health.energyLevel(85), 3);
    Test.assertEqual(Health.energyLevel(70), 3);
    Test.assertEqual(Health.energyLevel(69), 2);
    Test.assertEqual(Health.energyLevel(40), 2);
    Test.assertEqual(Health.energyLevel(24), 1);
    Test.assertEqual(Health.energyLevel(5), 0);
    Test.assert(Health.energyLevel(null) == null);
    return true;
}

(:test)
function stressUsesGarminBands(logger as Test.Logger) as Boolean {
    Test.assertEqual(Health.stressLevel(25), 3);
    Test.assertEqual(Health.stressLevel(26), 2);
    Test.assertEqual(Health.stressLevel(58), 1);
    Test.assertEqual(Health.stressLevel(76), 0);
    Test.assert(Health.stressLevel(-1) == null);
    Test.assertEqual(BodyWords.word("stress", 3), "Resting");
    Test.assertEqual(BodyWords.word("stress", 0), "High");
    return true;
}

(:test)
function sleepFollowsTheOvernightRecharge(logger as Test.Logger) as Boolean {
    Test.assertEqual(Health.sleepLevel(55), 3);
    Test.assertEqual(Health.sleepLevel(38), 2);
    Test.assertEqual(Health.sleepLevel(20), 1);
    Test.assertEqual(Health.sleepLevel(12), 0);
    Test.assert(Health.sleepLevel(null) == null);
    Test.assertEqual(BodyWords.word("sleep", 2), "Fair");
    return true;
}

(:test)
function heartComparesTodayWithTheUsualRestingRate(logger as Test.Logger) as Boolean {
    Test.assertEqual(Health.heartLevel(52, 52), 3);
    Test.assertEqual(Health.heartLevel(48, 52), 3);
    Test.assertEqual(Health.heartLevel(56, 52), 2);
    Test.assertEqual(Health.heartLevel(60, 52), 1);
    Test.assertEqual(Health.heartLevel(65, 52), 0);
    Test.assert(Health.heartLevel(60, null) == null);
    Test.assertEqual(BodyWords.word("heart", 3), "As usual");
    return true;
}

(:test)
function breathingPulseOxAndRecoveryHaveTheirOwnBands(logger as Test.Logger) as Boolean {
    Test.assertEqual(Health.breathingLevel(14), 3);
    Test.assertEqual(Health.breathingLevel(19), 2);
    Test.assertEqual(Health.breathingLevel(23), 1);
    Test.assertEqual(Health.pulseOxLevel(97), 3);
    Test.assertEqual(Health.pulseOxLevel(92), 2);
    Test.assertEqual(Health.recoveryLevel(0), 3);
    Test.assertEqual(Health.recoveryLevel(30), 1);
    return true;
}

(:test)
function overallIsBodyBatteryOrNothing(logger as Test.Logger) as Boolean {
    Test.assertEqual(Health.overall({ "energy" => 3, "sleep" => 0, "stress" => 0 } as Dictionary<String, Number or Null>), 3);
    Test.assert(Health.overall({ "sleep" => 0, "stress" => 1 } as Dictionary<String, Number or Null>) == null);
    Test.assert(Health.overall({ "breathing" => 3 } as Dictionary<String, Number or Null>) == null);
    Test.assertEqual(Health.overallWord(1), "Running low");
    Test.assertEqual(Health.overallWord(null), "No reading");
    return true;
}

(:test)
function onlyLevelsAndTheTimeLeaveTheWatch(logger as Test.Logger) as Boolean {
    var levels = { "energy" => 1, "sleep" => null, "stress" => 2, "heart" => 3, "breathing" => null, "pulseOx" => null, "recovery" => 3 } as Dictionary<String, Number or Null>;
    var result = Health.payload(levels);
    Test.assert(result != null);
    var p = result as Dictionary;
    Test.assert(!p.hasKey("sleep"));
    Test.assertEqual(p["energy"], 1);
    Test.assert(p["at"] instanceof String);
    var keys = p.keys();
    for (var i = 0; i < keys.size(); i++) {
        if (!"at".equals(keys[i])) {
            var v = p[keys[i]] as Number;
            Test.assert(v >= 0 && v <= 3);
        }
    }
    Test.assertEqual(Health.key(levels), "1-23--3");
    return true;
}

//! Missing sensor history must not become a timestamp-only upload rejected by the API.
(:test)
function unavailableReadingsDoNotCreateAnUpload(logger as Test.Logger) as Boolean {
    var none = Health.levels({} as Dictionary<String, Number or Null>);
    Test.assert(Health.payload(none) == null);
    Test.assert(Health.payload({} as Dictionary<String, Number or Null>) == null);
    return true;
}

//! Zero is a real band, not a missing reading.
(:test)
function lowestBandStillCreatesAnUpload(logger as Test.Logger) as Boolean {
    var result = Health.payload({ "energy" => 0 } as Dictionary<String, Number or Null>);
    Test.assert(result != null);
    var payload = result as Dictionary;
    Test.assertEqual(payload["energy"], 0);
    Test.assert(payload["at"] instanceof String);
    return true;
}

(:test)
function riseTrackerFindsHowMuchCameBack(logger as Test.Logger) as Boolean {
    var rise = new RiseTracker();
    var values = [40, 35, 22, 30, 51, 64, 60] as Array<Number>;
    for (var i = 0; i < values.size(); i++) {
        rise.add(values[i]);
    }
    Test.assertEqual(rise.best(), 42);
    var flat = new RiseTracker();
    flat.add(88);
    flat.add(88);
    flat.add(70);
    Test.assert(flat.best() == null);
    return true;
}

(:test)
function halfHourTrackerFindsTheRestingRate(logger as Test.Logger) as Boolean {
    var half = new HalfHourTracker();
    // 23:00-23:30 averages 60, 02:00-02:30 averages 50, 06:00 has too few samples to count
    var t0 = 1800 * 1000;
    half.add(t0, 62);
    half.add(t0 + 300, 58);
    half.add(t0 + 600, 60);
    half.add(t0 + 6 * 1800, 52);
    half.add(t0 + 6 * 1800 + 300, 48);
    half.add(t0 + 6 * 1800 + 600, 50);
    half.add(t0 + 14 * 1800, 40);
    Test.assertEqual(half.lowest(), 50);
    return true;
}
