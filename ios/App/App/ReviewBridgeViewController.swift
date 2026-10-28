import Capacitor
import StoreKit
import UIKit

class ReviewBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(AppReviewPlugin())
    }
}

@objc(AppReviewPlugin)
public class AppReviewPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppReviewPlugin"
    public let jsName = "AppReview"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise)
    ]

    @objc func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let controller = self?.bridge?.viewController,
                  let scene = controller.view.window?.windowScene,
                  scene.activationState == .foregroundActive,
                  controller.presentedViewController == nil else {
                call.resolve()
                return
            }
            // StoreKit decides whether to display anything. Never infer a rating.
            AppStore.requestReview(in: scene)
            call.resolve()
        }
    }
}
