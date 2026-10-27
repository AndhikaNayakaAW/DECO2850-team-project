import Toybox.Lang;
import Toybox.Test;

//! During a shift a new ask waits: the watch stays still, and buzzes once the shift ends.
(:test)
function anAskHeldDuringAShiftDoesNotBuzz(logger as Test.Logger) as Boolean {
    Test.assertEqual(Lines.buzzFor({ "id" => "o-2", "quiet" => "9 pm" }, "o-1", null), false);
    return true;
}

(:test)
function aHeldAskBuzzesOnceTheShiftEnds(logger as Test.Logger) as Boolean {
    Test.assertEqual(Lines.buzzFor({ "id" => "o-2", "quiet" => null }, null, "o-2"), true);
    return true;
}

(:test)
function aNewAskOffShiftStillBuzzes(logger as Test.Logger) as Boolean {
    Test.assertEqual(Lines.buzzFor({ "id" => "o-2", "quiet" => null }, "o-1", null), true);
    Test.assertEqual(Lines.buzzFor({ "id" => "o-1", "quiet" => null }, "o-1", null), false);
    return true;
}

(:test)
function aHeldAskSaysWhenTheWatchWillBuzz(logger as Test.Logger) as Boolean {
    Test.assertEqual(Lines.quiet({ "id" => "o-2", "quiet" => "9 pm" }), "9 pm");
    Test.assert(Lines.quiet({ "id" => "o-2", "quiet" => null }) == null);
    Test.assertEqual(askHint({ "id" => "o-2", "status" => "pending", "quiet" => "9 pm" }), "Quiet until 9 pm");
    return true;
}
