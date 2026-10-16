import Capacitor
import UIKit

// The app's own Capacitor plugins (not from npm) register here.
class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(InstagramStoriesPlugin())
    }
}
