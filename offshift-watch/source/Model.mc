import Toybox.Application;
import Toybox.Attention;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.System;
import Toybox.Timer;
import Toybox.WatchUi;

//! What every page shows, kept fresh while the app is open: the latest summary from the calendar
//! server (every 5 seconds) and the body as the watch reads it (every minute).
class OffshiftModel {
    private var _api as OffshiftApi;
    private var _timer as Timer.Timer?;
    private var _consentTimer as Timer.Timer?;
    private var _summary as Dictionary?;
    private var _status as String = "Checking your week";
    private var _syncedAt as String?;
    private var _readings as Dictionary<String, Number or Null> = {} as Dictionary<String, Number or Null>;
    private var _levels as Dictionary<String, Number or Null> = {} as Dictionary<String, Number or Null>;
    private var _readAt as Number?;
    private var _sentKey as String = "";
    private var _sentAt as Number = 0;
    private var _lastAskId as String?;

    function initialize(api as OffshiftApi) {
        _api = api;
    }

    function start() as Void {
        if (_timer != null) {
            return;
        }
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

    //! Asked once: may the calendar hear the body readings?
    function askConsent() as Void {
        _consentTimer = null;
        WatchUi.pushView(new WatchUi.Confirmation("Share body readings with your calendar? Words only, never numbers."), new ConsentDelegate(self), WatchUi.SLIDE_UP);
    }

    function setSharing(on as Boolean) as Void {
        Sharing.set(on);
        _sentKey = "";
        if (!on) {
            _api.stopSharing(method(:onSummary));
        }
        note(on ? "Sharing words with your calendar" : "Body readings stay on your watch");
        refresh();
    }

    //! Read the body once a minute, share it when it changed, and fetch the latest ask.
    function refresh() as Void {
        if (!_api.isIdle()) {
            return;
        }
        var now = System.getTimer();
        if (_readAt == null || now - _readAt > 60000) {
            _readings = Health.read();
            _levels = Health.levels(_readings);
            _readAt = now;
            Application.Storage.setValue("body", Health.overallWord(Health.overall(_levels)));
            WatchUi.requestUpdate();
        }
        if (Sharing.isOn()) {
            var key = Health.key(_levels);
            if (!key.equals(_sentKey) || now - _sentAt > 300000) {
                _sentKey = key;
                _sentAt = now;
                _api.sendHealth(Health.payload(_levels), method(:onSummary));
                return;
            }
        }
        _api.getSummary(method(:onSummary));
    }

    function onSummary(code as Number, data as Dictionary or String or Null) as Void {
        if (code == 200 && data instanceof Dictionary) {
            _summary = data;
            _status = "";
            _syncedAt = Clock.now();
            remember(data);
        } else {
            System.println("Offshift: server answered " + code.toString());
            _status = (code == Communications.BLE_CONNECTION_UNAVAILABLE) ? "Phone not connected" : "Calendar offline (" + code.toString() + ")";
        }
        WatchUi.requestUpdate();
    }

    //! Buzz once when a new ask arrives, and keep a line for the glance.
    private function remember(data as Dictionary) as Void {
        var ask = data["ask"];
        if (ask instanceof Dictionary) {
            var id = ask["id"] as String;
            if (_lastAskId != null && !id.equals(_lastAskId) && (Attention has :vibrate)) {
                Attention.vibrate([new Attention.VibeProfile(60, 400)]);
            }
            _lastAskId = id;
            Application.Storage.setValue("seenAsk", id);
            Application.Storage.setValue("glance", Lines.ask(ask));
        } else {
            _lastAskId = null;
            Application.Storage.setValue("glance", "Nothing waiting");
        }
    }

    function answer(decision as String) as Void {
        var ask = self.ask();
        if (ask == null) {
            return;
        }
        _api.answer(ask["id"] as String, decision, method(:onAnswered));
    }

    function onAnswered(code as Number, data as Dictionary or String or Null) as Void {
        if ((code == 200 || code == 409) && data instanceof Dictionary) {
            _summary = data;
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

    //! Shows a summary and body levels without the server or the sensors. The layout tests use it.
    function show(summary as Dictionary?, levels as Dictionary<String, Number or Null>) as Void {
        _summary = summary;
        _status = (summary != null) ? "" : "Phone not connected";
        _syncedAt = "10:01 pm";
        _levels = levels;
    }

    /* ---------- what the pages read ---------- */

    function ask() as Dictionary? {
        if (_summary == null) {
            return null;
        }
        var ask = _summary["ask"];
        return (ask instanceof Dictionary) ? ask : null;
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

    function readings() as Dictionary<String, Number or Null> {
        return _readings;
    }

    function levels() as Dictionary<String, Number or Null> {
        return _levels;
    }
}
