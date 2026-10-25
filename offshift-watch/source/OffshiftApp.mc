import Toybox.Application;
import Toybox.Background;
import Toybox.Lang;
import Toybox.System;
import Toybox.Time;
import Toybox.WatchUi;

//! Offshift on the wrist: four pages (the ask, the week around it, the last shift, the calendar link)
//! and three answers. A background check every five minutes keeps the calendar and the glance current.
(:background)
class OffshiftApp extends Application.AppBase {

    function initialize() {
        AppBase.initialize();
    }

    function onStart(state as Dictionary?) as Void {
    }

    function onStop(state as Dictionary?) as Void {
    }

    function getInitialView() as [Views] or [Views, InputDelegates] {
        if (Toybox has :Background) {
            Background.registerForTemporalEvent(new Time.Duration(5 * 60));
        }
        var model = new OffshiftModel(new OffshiftApi());
        model.start();
        var loop = new WatchUi.ViewLoop(new OffshiftPages(model), { :page => 0, :wrap => false, :color => Palette.MUSTARD });
        return [loop, new WatchUi.ViewLoopDelegate(loop)];
    }

    function getServiceDelegate() as [System.ServiceDelegate] {
        return [new OffshiftService()];
    }

    function onBackgroundData(data as Application.PersistableType) as Void {
        WatchUi.requestUpdate();
    }

    (:glance)
    function getGlanceView() as [GlanceView] or [GlanceView, GlanceViewDelegate] or Null {
        return [new OffshiftGlance()];
    }
}
