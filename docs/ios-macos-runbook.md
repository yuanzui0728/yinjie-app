# iOS macOS Runbook

日期：2026-04-06
用途：在 macOS/Xcode 环境中按固定顺序完成隐界 iOS 壳接入、真机调试与提审前收口

---

## 0. 目标

这份 runbook 只做一件事：

把已经在仓库里准备好的 iOS 资产，按最短路径落到真实 Xcode 工程和真机验证里。

适用前提：

1. 代码仓库已拉到本地
2. 使用 macOS
3. 已安装 Xcode / CocoaPods / Node.js / pnpm

---

## 1. 一次性环境准备

在仓库根目录执行：

```bash
pnpm install
```

设置 iOS 远程服务地址：

```bash
export YINJIE_IOS_CORE_API_BASE_URL="https://your-core-api.example.com"
export VITE_APP_PLATFORM="ios"
export VITE_CORE_API_BASE_URL="https://your-core-api.example.com"
export VITE_SOCKET_BASE_URL="https://your-core-api.example.com"
```

验收：

1. `echo $YINJIE_IOS_CORE_API_BASE_URL` 有值
2. `pnpm --dir apps/app build` 能成功

---

## 2. 壳工程初始化

先做预检查：

```bash
pnpm ios:doctor
```

预期：

1. `platform` 为 PASS
2. `xcode-template` 为 PASS
3. `runtime-config-template` 为 PASS
4. `plugin-stubs` 为 PASS

生成 iOS 工程：

```bash
pnpm ios:sync
```

将模板和 plugin stub 复制进生成工程：

```bash
pnpm ios:configure
```

打开 Xcode：

```bash
pnpm ios:open
```

验收：

1. `apps/ios-shell/ios/` 已生成
2. Xcode 能打开工程
3. `ios/App/App/Plugins/` 下能看到两个 Swift stub

---

## 3. Xcode 内动作

按顺序处理：

1. 选择 Team
2. 配置 Signing
3. 设置 Bundle Identifier
4. 将以下样例映射到真实工程

来源文件：

1. [`Info.plist.example`](/home/ps/claude/yinjie-app/apps/ios-shell/xcode-template/Info.plist.example)
2. [`PrivacyInfo.xcprivacy.example`](/home/ps/claude/yinjie-app/apps/ios-shell/xcode-template/PrivacyInfo.xcprivacy.example)
3. [`App.entitlements.example`](/home/ps/claude/yinjie-app/apps/ios-shell/xcode-template/App.entitlements.example)
4. [`Capabilities.example.md`](/home/ps/claude/yinjie-app/apps/ios-shell/xcode-template/Capabilities.example.md)

5. 把 copied files 加进 target membership
6. 确认 deployment target、bundle version、app icon、launch screen

验收：

1. Xcode 无 signing error
2. 工程能编译到模拟器
3. 工程能编译到真机

---

## 4. Native Plugin 接线

按以下文档执行：

1. [`ios-plugin-implementation-guide.md`](/home/ps/claude/yinjie-app/docs/ios-plugin-implementation-guide.md)
2. [`YinjieRuntime.md`](/home/ps/claude/yinjie-app/apps/ios-shell/plugins/YinjieRuntime.md)
3. [`YinjieSecureStorage.md`](/home/ps/claude/yinjie-app/apps/ios-shell/plugins/YinjieSecureStorage.md)

具体动作：

1. 用真实实现替换 `YinjieRuntimePlugin.swift`
2. 用真实 Keychain 逻辑替换 `YinjieSecureStoragePlugin.swift`
3. 重新编译 App

验收：

1. App 启动后能读取远程 `apiBaseUrl`
2. 登录后杀进程重开仍保持 session
3. 删除账号/退出登录后 session 被清空

---

## 5. 真机回归

按以下文档逐项执行：

- [`ios-device-regression-checklist.md`](/home/ps/claude/yinjie-app/docs/ios-device-regression-checklist.md)

最低必须通过：

1. 启动与环境
2. 账号与会话
3. 单聊 / 群聊
4. 举报 / 屏蔽 / 解除屏蔽
5. 删除账号
6. 法务页

建议至少覆盖：

1. 一台刘海屏 iPhone
2. 一台较小屏设备或模拟器
3. 一个较新 iOS 版本

---

## 6. 提审材料填写

按以下顺序：

1. [`ios-app-store-metadata-draft.md`](/home/ps/claude/yinjie-app/docs/ios-app-store-metadata-draft.md)
2. [`ios-review-notes-template.md`](/home/ps/claude/yinjie-app/docs/ios-review-notes-template.md)
3. [`ios-test-account-template.md`](/home/ps/claude/yinjie-app/docs/ios-test-account-template.md)
4. [`ios-app-store-submission.md`](/home/ps/claude/yinjie-app/docs/ios-app-store-submission.md)

验收：

1. App Name / Subtitle / Description 已填
2. Review Notes 已填
3. 测试账号已填
4. Privacy Policy URL / Support URL 已填

---

## 7. 提交前最终检查

对照：

- [`ios-preflight-p0-p1.md`](/home/ps/claude/yinjie-app/docs/ios-preflight-p0-p1.md)

必须全部完成的 P0：

1. Xcode 工程可签名
2. 远程 Core API 正式可用
3. `YinjieRuntime` plugin 真正落地
4. `YinjieSecureStorage` plugin 真正落地
5. 真机回归完成
6. 提审资料填写完成
7. Privacy / Info.plist / Entitlements 已映射到真实工程

---

## 8. 最小命令序列

如果只看命令，按这个顺序：

```bash
pnpm install
export YINJIE_IOS_CORE_API_BASE_URL="https://your-core-api.example.com"
export VITE_APP_PLATFORM="ios"
export VITE_CORE_API_BASE_URL="https://your-core-api.example.com"
export VITE_SOCKET_BASE_URL="https://your-core-api.example.com"
pnpm ios:doctor
pnpm ios:sync
pnpm ios:configure
pnpm ios:open
```

之后进入 Xcode 和真机阶段。
