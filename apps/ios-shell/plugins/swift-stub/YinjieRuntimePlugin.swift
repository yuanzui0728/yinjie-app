import Foundation
import Capacitor

@objc(YinjieRuntimePlugin)
public class YinjieRuntimePlugin: CAPPlugin {
    @objc func getConfig(_ call: CAPPluginCall) {
        call.resolve([
            "apiBaseUrl": "https://api.example.yinjie.app",
            "socketBaseUrl": "https://api.example.yinjie.app",
            "environment": "production",
            "publicAppName": "Yinjie",
            "applicationId": Bundle.main.bundleIdentifier ?? "com.yinjie.ios"
        ])
    }
}
