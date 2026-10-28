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
        // Capacitor invokes plugins on its bridge queue. Use Objective-C's main
        // thread dispatch for its non-Sendable call object rather than capturing
        // the plugin and call in a Swift @Sendable closure.
        perform(#selector(requestReviewOnMainThread(_:)), on: Thread.main,
                with: call, waitUntilDone: false)
    }

    @MainActor
    @objc private func requestReviewOnMainThread(_ call: CAPPluginCall) {
        guard let controller = bridge?.viewController,
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
