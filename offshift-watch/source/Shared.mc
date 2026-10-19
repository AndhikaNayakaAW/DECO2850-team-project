import Toybox.Application;
import Toybox.Lang;

//! Whether the worker lets the calendar hear the body readings. Asked once, changeable on the Body screen.
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
        var url = Application.Properties.getValue("baseUrl");
        return (url instanceof String) ? url : "http://127.0.0.1:3000";
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
}
