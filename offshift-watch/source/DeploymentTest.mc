import Toybox.Application;
import Toybox.Test;
import Toybox.Lang;

(:test)
function anOldLaptopSettingCannotOverrideTheInstalledDeployment(logger as Test.Logger) as Boolean {
    var previous = Application.Properties.getValue("baseUrl");
    Application.Properties.setValue("baseUrl", "http://127.0.0.1:3000");
    var actual = Server.baseUrl();
    Application.Properties.setValue("baseUrl", previous);
    Test.assertEqual(actual, Deployment.BASE_URL);
    return true;
}
