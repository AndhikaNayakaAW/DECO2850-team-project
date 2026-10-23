import Toybox.Lang;
import Toybox.Test;

//! An ask has three answers on the wrist, the same as the calendar, and none of them sends a message.
(:test)
function anAskHasThreeAnswers(logger as Test.Logger) as Boolean {
    var choices = answerChoices((ask(false) as Dictionary)["ask"] as Dictionary);
    Test.assertEqual(choices.size(), 3);
    Test.assertEqual((choices[0] as Array)[2], "accept");
    Test.assertEqual((choices[1] as Array)[2], "decline");
    Test.assertEqual((choices[2] as Array)[2], "later");
    return true;
}

(:test)
function confirmingAnAnswerNeverSaysSend(logger as Test.Logger) as Boolean {
    Test.assertEqual(answerPrompt("accept"), "Add this shift to your week?");
    Test.assertEqual(answerPrompt("decline"), "Decline this shift?");
    return true;
}

(:test)
function anAskSavedForLaterSaysSoInsteadOfAReminder(logger as Test.Logger) as Boolean {
    Test.assertEqual(askHint((ask(true) as Dictionary)["ask"] as Dictionary), "Saved for later");
    Test.assertEqual(askHint((ask(false) as Dictionary)["ask"] as Dictionary), "Press to answer");
    Test.assert(askHint(null) == null);
    return true;
}
