import Toybox.Application;
import Toybox.Lang;

//! Whether the worker lets the calendar have heart rate and stress from their shifts. Asked once, changeable on the Last shift page.
(:background)
module Sharing {

    //! true or false once asked, null before.
    function choice() as Boolean? {
        var v = Application.Storage.getValue("share");
        return (v instanceof Boolean) ? v : null;
    }

    function isOn() as Boolean {
        return choice() == true;
    }

    function set(on as Boolean) as Void {
        Application.Storage.setValue("share", on);
    }
}

//! Where the Offshift server lives. A real watch needs an https address.
(:background)
module Server {

    function baseUrl() as String {
        return Deployment.BASE_URL;
    }
}

//! Short lines about an ask, for the glance and the wake-up prompt.
(:background)
module Lines {

    function ask(ask as Dictionary) as String {
        return (ask["from"] as String) + ": " + (ask["when"] as String) + " " + (ask["time"] as String);
    }

    function wake(ask as Dictionary) as String {
        return (ask["from"] as String) + " asked you to cover " + (ask["when"] as String) + ", " + (ask["time"] as String) + ". Open Offshift?";
    }

    //! The end of the shift the worker is on ("9 pm") while a new ask waits to buzz, or null when it may buzz now.
    function quiet(ask as Dictionary) as String? {
        var until = ask["quiet"];
        return (until instanceof String) ? until : null;
    }

    //! Buzz for an ask that is new since the last one, or one held during a shift that has now ended. Never during a shift.
    function buzzFor(ask as Dictionary, lastId as String?, heldId as String?) as Boolean {
        if (quiet(ask) != null) {
            return false;
        }
        var id = ask["id"] as String;
        return id.equals(heldId) || (lastId != null && !id.equals(lastId));
    }
}
