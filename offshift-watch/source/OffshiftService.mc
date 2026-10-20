import Toybox.Application;
import Toybox.Background;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.System;

//! Every five minutes, even with the app closed: share the body if the worker allows it,
//! and look for a new ask. A new ask offers to open the app; nothing is answered from here.
(:background)
class OffshiftService extends System.ServiceDelegate {

    function initialize() {
        ServiceDelegate.initialize();
    }

    function onTemporalEvent() as Void {
        var params = null;
        var httpMethod = Communications.HTTP_REQUEST_METHOD_GET;
        if (Sharing.isOn()) {
            var payload = Health.payload(Health.levels(Health.read()));
            if (payload != null) {
                params = { "health" => payload };
                httpMethod = Communications.HTTP_REQUEST_METHOD_POST;
            }
        }
        var options = {
            :method => httpMethod,
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON,
            :headers => { "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON }
        };
        Communications.makeWebRequest(Server.baseUrl() + "/api/watch", params, options, method(:onReply));
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
            }
        }
        Background.exit(code);
    }
}
