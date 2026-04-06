# iOS Xcode Integration Checklist

用于 macOS/Xcode 接入阶段的工程动作列表。

## 工程初始化

1. 在 macOS 上执行 `pnpm --dir apps/ios-shell install`
2. 执行 `pnpm ios:doctor`
3. 执行 `pnpm ios:sync`
4. 执行 `pnpm ios:configure`
5. 执行 `pnpm ios:open`

## Xcode 侧

1. 配置 Team
2. 配置 Signing
3. 设置 Bundle Identifier
4. 导入 `Info.plist.example`
5. 导入 `PrivacyInfo.xcprivacy.example`
6. 导入 `App.entitlements.example`
7. 启用 Capabilities

## Plugin 接入

1. 将 `plugins/swift-stub/YinjieRuntimePlugin.swift` 移入 iOS 工程
2. 将 `plugins/swift-stub/YinjieSecureStoragePlugin.swift` 移入 iOS 工程
3. 替换 stub 为真实实现
4. 验证 Web 层能成功调用 plugin

## 提审前

1. 运行 `docs/ios-device-regression-checklist.md`
2. 完成 `docs/ios-review-notes-template.md`
3. 完成 `docs/ios-test-account-template.md`
4. 完成 `docs/ios-app-store-metadata-draft.md`
