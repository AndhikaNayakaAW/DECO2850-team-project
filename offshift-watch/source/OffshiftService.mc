import Toybox.Application;
import Toybox.Background;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.System;

//! Every five minutes, even with the app closed: look for a new ask or a shift that just finished.
//! A new ask or a check-in offers to open the app. If the worker shares, a finished shift is read and sent as levels;
//! if they turned sharing off, the calendar is asked to forget until it does. Nothing is answered from here.
(:background)
class OffshiftService extends System.ServiceDelegate {
    private var _sending as String?;

    function initialize() {
        ServiceDelegate.initialize();
    }

    function onTemporalEvent() as Void {
        if (Application.Storage.getValue("forgetPending") == true) {
            Communications.makeWebRequest(Server.baseUrl() + "/api/watch", { "health" => { "share" => false } }, options(Communications.HTTP_REQUEST_METHOD_POST), method(:onForgotten));
            return;
        }
        Communications.makeWebRequest(Server.baseUrl() + "/api/watch", null, options(Communications.HTTP_REQUEST_METHOD_GET), method(:onReply));
    }

    function onForgotten(code as Number, data as Dictionary or String or Null) as Void {
        if (code == 200) {
            Application.Storage.deleteValue("forgetPending");
        }
        Background.exit(code);
    }

    function options(httpMethod as Communications.HttpRequestMethod) as Dictionary {
        return {
            :method => httpMethod,
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON,
            :headers => { "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON }
        };
    }

    function onReply(code as Number, data as Dictionary or String or Null) as Void {
        if (code == 200 && data instanceof Dictionary) {
            var ask = data["ask"];
            if (ask instanceof Dictionary) {
                Application.Storage.setValue("glance", Lines.ask(ask));
                var id = ask["id"] as String;
                if (!id.equals(Application.Storage.getValue("seenAsk"))) {
                    Application.Storage.setValue("seenAsk", id);
                    Background.requestApplicationWake(Lines.wake(ask));
                }
            } else {
                Application.Storage.setValue("glance", "Nothing waiting");
                // No new ask: a shift that just finished asks how the work was, once.
                var checkIn = data["checkIn"];
                if (checkIn instanceof Dictionary) {
                    var shift = checkIn["id"] as String;
                    if (!shift.equals(Application.Storage.getValue("wokeCheckIn"))) {
                        Application.Storage.setValue("wokeCheckIn", shift);
                        Background.requestApplicationWake("How was the work? " + (checkIn["title"] as String));
                    }
                }
            }
            if (ShiftBody.stillHeld(data)) {
                Application.Storage.setValue("forgetPending", true);
            }
            if (readShift(data)) {
                return;
            }
        }
        Background.exit(code);
    }

    //! A shift that just finished: send its readings now, so they reach the calendar even if the app stays closed.
    function readShift(data as Dictionary) as Boolean {
        var due = data["shiftBody"];
        if (!Sharing.isOn() || !(due instanceof Dictionary)) {
            return false;
        }
        var key = ShiftBody.key(due);
        if (key.equals(Application.Storage.getValue("sentShiftBody"))) {
            return false;
        }
        var l = ShiftBody.levelsFor(due);
        var payload = ShiftBody.payload(due, l);
        ShiftBody.remember(due, l);
        _sending = key;
        Communications.makeWebRequest(Server.baseUrl() + "/api/watch", { "shiftBody" => payload }, options(Communications.HTTP_REQUEST_METHOD_POST), method(:onSent));
        return true;
    }

    function onSent(code as Number, data as Dictionary or String or Null) as Void {
        Application.Storage.setValue("lastSend", code);
        if (_sending != null && ShiftBody.settled(code)) {
            Application.Storage.setValue("sentShiftBody", _sending);
        }
        Background.exit(code);
    }
}
