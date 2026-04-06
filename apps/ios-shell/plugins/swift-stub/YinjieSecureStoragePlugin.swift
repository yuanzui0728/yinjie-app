import Foundation
import Capacitor

@objc(YinjieSecureStoragePlugin)
public class YinjieSecureStoragePlugin: CAPPlugin {
    @objc func get(_ call: CAPPluginCall) {
        let key = call.getString("key") ?? ""
        guard !key.isEmpty else {
            call.resolve(["value": NSNull()])
            return
        }

        call.resolve([
            "value": NSNull()
        ])
    }

    @objc func set(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func remove(_ call: CAPPluginCall) {
        call.resolve()
    }
}
