import Toybox.Application;
import Toybox.Attention;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.System;
import Toybox.Timer;
import Toybox.WatchUi;

//! What every page shows, kept fresh while the app is open: the latest summary from the calendar
//! server (every 5 seconds), and the last shift the watch read once it was over.
class OffshiftModel {
    private var _api as OffshiftApi;
    private var _timer as Timer.Timer?;
    private var _consentTimer as Timer.Timer?;
    private var _summary as Dictionary?;
    private var _status as String = "Checking your week";
    private var _syncedAt as String?;
    private var _lastShift as Dictionary?;
    private var _shown as Boolean = false;
    private var _pendingBody as String?;
    //! After a failed send, when to try that shift again (System.getTimer), so the history isn't re-read every 5 seconds.
    private var _retryBodyAt as Number?;
    private var _lastAskId as String?;
    private var _heldAskId as String?;
    private var _started as Boolean = false;

    function initialize(api as OffshiftApi) {
        _api = api;
    }

    function start() as Void {
        if (_timer != null) {
            return;
        }
        _started = true;
        refresh();
        _timer = new Timer.Timer();
        _timer.start(method(:refresh), 5000, true);
        if (Sharing.choice() == null) {
            _consentTimer = new Timer.Timer();
            _consentTimer.start(method(:askConsent), 600, false);
        }
    }

    function stop() as Void {
        if (_timer != null) {
            _timer.stop();
            _timer = null;
        }
    }

    //! Asked once: may the calendar hear heart rate and stress from the worker's shifts?
    function askConsent() as Void {
        _consentTimer = null;
        WatchUi.pushView(new WatchUi.Confirmation("Share stress and heart from shifts?"), new ConsentDelegate(self), WatchUi.SLIDE_UP);
    }

    function setSharing(on as Boolean) as Void {
        Sharing.set(on);
        if (!on) {
            // The calendar must forget every shift's readings; this is sent until it answers.
            // Turned on again, an unexpired shift is read again.
            Application.Storage.deleteValue("sentShiftBody");
            Application.Storage.setValue("forgetPending", true);
        }
        note(on ? "Shift readings go to your calendar" : "Off: your shifts aren't read");
        refresh();
    }

    //! Ask the calendar to forget, while that is still owed; otherwise fetch the latest ask and the shift, if any, that just finished.
    function refresh() as Void {
        if (!_api.isIdle()) {
            return;
        }
        if (Application.Storage.getValue("forgetPending") == true) {
            _api.stopSharing(method(:onForgotten));
            return;
        }
        _api.getSummary(method(:onSummary));
    }

    //! The calendar answered "sharing off": it has forgotten every shift's readings.
    function onForgotten(code as Number, data as Dictionary or String or Null) as Void {
        if (code == 200) {
            Application.Storage.deleteValue("forgetPending");
        }
        onSummary(code, data);
    }

    function onSummary(code as Number, data as Dictionary or String or Null) as Void {
        if (code == 200 && data instanceof Dictionary) {
            _summary = data;
            _status = "";
            _syncedAt = Clock.now();
            remember(data);
        } else {
            System.println("Offshift: server answered " + code.toString());
            _status = (code == 401 || code == 403) ? "Access code needed" : (code == Communications.BLE_CONNECTION_UNAVAILABLE) ? "Phone not connected" : "Calendar offline (" + code.toString() + ")";
        }
        WatchUi.requestUpdate();
    }

    //! Buzz once when a new ask arrives, or when the shift it arrived during ends, and keep a line for the glance.
    private function remember(data as Dictionary) as Void {
        var ask = data["ask"];
        if (ask instanceof Dictionary) {
            var id = ask["id"] as String;
            if (Lines.buzzFor(ask, _lastAskId, _heldAskId) && (Attention has :vibrate)) {
                Attention.vibrate([new Attention.VibeProfile(60, 400)]);
            }
            if (Lines.quiet(ask) != null) {
                // On a shift: stay still, and buzz for this ask once the shift ends. The background wake waits too.
                if (!id.equals(_lastAskId)) {
                    _heldAskId = id;
                }
            } else {
                _heldAskId = null;
                Application.Storage.setValue("seenAsk", id);
            }
            _lastAskId = id;
            Application.Storage.setValue("glance", Lines.ask(ask));
        } else {
            _lastAskId = null;
            Application.Storage.setValue("glance", "Nothing waiting");
        }
        promptCheckIn(data);
        // Before reading: a shift this watch has just read stays shown until the calendar has it too.
        ShiftBody.keepFrom(data);
        readShift(data);
        if (ShiftBody.stillHeld(data)) {
            Application.Storage.setValue("forgetPending", true);
        }
    }

    //! A shift that just finished: read its heart rate and stress from the watch's history and send the levels, once.
    function readShift(data as Dictionary) as Void {
        var due = data["shiftBody"];
        if (!Sharing.isOn() || !(due instanceof Dictionary)) {
            return;
        }
        var key = ShiftBody.key(due);
        if (key.equals(Application.Storage.getValue("sentShiftBody")) || key.equals(_pendingBody)) {
            return;
        }
        if (_retryBodyAt != null && System.getTimer() < _retryBodyAt) {
            return;
        }
        var l = ShiftBody.levelsFor(due);
        var payload = ShiftBody.payload(due, l);
        ShiftBody.remember(due, l);
        _lastShift = null;
        _pendingBody = key;
        _api.sendShiftBody(payload, method(:onShiftBodySent));
    }

    function onShiftBodySent(code as Number, data as Dictionary or String or Null) as Void {
        Application.Storage.setValue("lastSend", code);
        if (_pendingBody != null) {
            if (ShiftBody.settled(code)) {
                Application.Storage.setValue("sentShiftBody", _pendingBody);
                _retryBodyAt = null;
            } else {
                _retryBodyAt = System.getTimer() + 60000;
            }
        }
        _pendingBody = null;
        if (code == 200 && data instanceof Dictionary) {
            _summary = data;
            _status = "";
            _syncedAt = Clock.now();
        }
        WatchUi.requestUpdate();
    }

    //! A shift just finished: buzz and ask how the work was, once for that shift.
    private function promptCheckIn(data as Dictionary) as Void {
        var checkIn = data["checkIn"];
        if (!_started || !(checkIn instanceof Dictionary)) {
            return;
        }
        var id = checkIn["id"] as String;
        if (id.equals(Application.Storage.getValue("promptedCheckIn"))) {
            return;
        }
        Application.Storage.setValue("promptedCheckIn", id);
        if (Attention has :vibrate) {
            Attention.vibrate([new Attention.VibeProfile(40, 300)]);
        }
        pushCheckInMenu(self, checkIn);
    }

    //! Saves how the work was on the shift the worker was asked about. Nothing goes to the manager.
    //! The id comes from the open question, not the latest summary, which a refresh may have moved on.
    function rate(shiftId as String, level as String) as Void {
        _api.rate(shiftId, level, method(:onAnswered));
    }

    //! Answers the ask the worker opened. The server says if it was already answered elsewhere.
    function answer(offerId as String, decision as String) as Void {
        _api.answer(offerId, decision, method(:onAnswered));
    }

    function onAnswered(code as Number, data as Dictionary or String or Null) as Void {
        if ((code == 200 || code == 409) && data instanceof Dictionary) {
            _summary = data;
            _status = "";
            _syncedAt = Clock.now();
            remember(data);
            var toast = data["toast"];
            note((toast instanceof String) ? toast : "Already answered");
        } else {
            note("Not sent. Try again.");
        }
        WatchUi.requestUpdate();
    }

    function note(text as String) as Void {
        if (WatchUi has :showToast) {
            WatchUi.showToast(text, null);
        }
    }

    //! Shows a summary and a last shift without the server or the sensors. The layout tests use it.
    function show(summary as Dictionary?, lastShift as Dictionary?) as Void {
        _summary = summary;
        _status = (summary != null) ? "" : "Phone not connected";
        _syncedAt = "10:01 pm";
        _lastShift = lastShift;
        _shown = true;
    }

    /* ---------- what the pages read ---------- */

    function ask() as Dictionary? {
        if (_summary == null) {
            return null;
        }
        var ask = _summary["ask"];
        return (ask instanceof Dictionary) ? ask : null;
    }

    //! The shift that just finished, if the calendar wants to know how the work was.
    function checkIn() as Dictionary? {
        if (_summary == null) {
            return null;
        }
        var checkIn = _summary["checkIn"];
        return (checkIn instanceof Dictionary) ? checkIn : null;
    }

    function summary() as Dictionary? {
        return _summary;
    }

    //! Empty once the calendar has answered; otherwise why it hasn't.
    function status() as String {
        return _status;
    }

    function syncedAt() as String? {
        return _syncedAt;
    }

    //! The last shift the watch read: its title and both signals, block by block. Null before the first one.
    function lastShift() as Dictionary? {
        if (_shown || _lastShift != null) {
            return _lastShift;
        }
        var saved = Application.Storage.getValue("lastShift");
        return (saved instanceof Dictionary) ? saved : null;
    }
}
