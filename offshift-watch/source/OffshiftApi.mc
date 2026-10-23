import Toybox.Communications;
import Toybox.Lang;

typedef ResponseCallback as Method(responseCode as Number, data as Dictionary or String or Null) as Void;

//! One request waiting its turn.
class PendingRequest {
    var httpMethod as Communications.HttpRequestMethod;
    var params as Dictionary?;
    var callback as ResponseCallback;

    function initialize(httpMethod as Communications.HttpRequestMethod, params as Dictionary?, callback as ResponseCallback) {
        self.httpMethod = httpMethod;
        self.params = params;
        self.callback = callback;
    }
}

//! Talks to the Offshift server one request at a time, so polling never collides with an answer.
class OffshiftApi {
    private var _busy as Boolean = false;
    private var _queue as Array<PendingRequest> = [] as Array<PendingRequest>;
    private var _callback as ResponseCallback?;

    function initialize() {
    }

    function baseUrl() as String {
        return Server.baseUrl();
    }

    function isIdle() as Boolean {
        return !_busy && _queue.size() == 0;
    }

    //! What the watch should show right now.
    function getSummary(callback as ResponseCallback) as Void {
        enqueue(new PendingRequest(Communications.HTTP_REQUEST_METHOD_GET, null, callback));
    }

    //! Sends one of: accept, decline, later.
    function answer(offerId as String, decision as String, callback as ResponseCallback) as Void {
        enqueue(new PendingRequest(Communications.HTTP_REQUEST_METHOD_POST, { "answer" => { "offerId" => offerId, "decision" => decision } }, callback));
    }

    //! Shares the body as a level from 0 to 3 per signal, never the raw numbers.
    function sendHealth(payload as Dictionary, callback as ResponseCallback) as Void {
        enqueue(new PendingRequest(Communications.HTTP_REQUEST_METHOD_POST, { "health" => payload }, callback));
    }

    //! Sharing turned off: the calendar forgets the last reading.
    function stopSharing(callback as ResponseCallback) as Void {
        enqueue(new PendingRequest(Communications.HTTP_REQUEST_METHOD_POST, { "health" => { "share" => false } }, callback));
    }

    private function enqueue(request as PendingRequest) as Void {
        _queue.add(request);
        if (!_busy) {
            sendNext();
        }
    }

    private function sendNext() as Void {
        if (_queue.size() == 0) {
            return;
        }
        var request = _queue[0];
        _queue = _queue.slice(1, null);
        _busy = true;
        _callback = request.callback;
        var options = {
            :method => request.httpMethod,
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON,
            :headers => { "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON }
        };
        Communications.makeWebRequest(baseUrl() + "/api/watch", request.params, options, method(:onResponse));
    }

    function onResponse(responseCode as Number, data as Dictionary or String or Null) as Void {
        _busy = false;
        var callback = _callback;
        _callback = null;
        if (callback != null) {
            callback.invoke(responseCode, data);
        }
        sendNext();
    }
}
