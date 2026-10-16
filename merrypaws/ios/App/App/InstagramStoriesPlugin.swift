import Capacitor
import UIKit

// Opens Instagram's story composer with the story card as the background
// (Meta's "Sharing to Stories"). Called from src/lib/share.ts.
@objc(InstagramStoriesPlugin)
public class InstagramStoriesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InstagramStoriesPlugin"
    public let jsName = "InstagramStories"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise)
    ]

    @objc func share(_ call: CAPPluginCall) {
        guard let image = call.getString("backgroundImage"),
              let appId = call.getString("appId"), !appId.isEmpty,
              let data = Data(base64Encoded: image.components(separatedBy: ",").last ?? ""),
              let url = URL(string: "instagram-stories://share?source_application=\(appId)")
        else {
            call.reject("A background image and a Meta App ID are needed", "MISSING")
            return
        }
        DispatchQueue.main.async {
            guard UIApplication.shared.canOpenURL(url) else {
                call.reject("Instagram is not installed", "NOT_INSTALLED")
                return
            }
            UIPasteboard.general.setItems(
                [["com.instagram.sharedSticker.backgroundImage": data]],
                options: [.expirationDate: Date().addingTimeInterval(300)]
            )
            UIApplication.shared.open(url) { opened in
                if opened { call.resolve() } else { call.reject("Couldn't open Instagram", "FAILED") }
            }
        }
    }
}
