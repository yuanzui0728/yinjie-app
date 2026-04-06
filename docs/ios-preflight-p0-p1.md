# iOS Preflight P0/P1

日期：2026-04-06
目标：明确 iOS 提审前剩余工作里，哪些属于必须立即完成，哪些属于次级收口。

---

## P0

这些项不完成，不建议提交审核。

### P0-1 Xcode 工程真正生成并可签名

状态：未完成

需要：

1. `pnpm ios:sync`
2. `pnpm ios:open`
3. Team / Signing / Bundle Identifier 完成

### P0-2 远程 Core API 正式可用

状态：未完成

需要：

1. HTTPS
2. WSS
3. 稳定域名
4. 生产环境可访问

### P0-3 YinjieRuntime plugin 真正落地

状态：未完成

需要：

1. iOS 工程中接入真实 plugin
2. 能返回正式 runtime config

### P0-4 YinjieSecureStorage plugin 真正落地

状态：未完成

需要：

1. Keychain 存储
2. session 恢复
3. 删除账号/退出登录后的清理

### P0-5 真机回归

状态：未完成

依据：

- [`ios-device-regression-checklist.md`](/home/ps/claude/yinjie-app/docs/ios-device-regression-checklist.md)

### P0-6 提审资料填写

状态：草案已完成，正式填写未完成

依据：

- [`ios-review-notes-template.md`](/home/ps/claude/yinjie-app/docs/ios-review-notes-template.md)
- [`ios-test-account-template.md`](/home/ps/claude/yinjie-app/docs/ios-test-account-template.md)
- [`ios-app-store-metadata-draft.md`](/home/ps/claude/yinjie-app/docs/ios-app-store-metadata-draft.md)

### P0-7 Privacy / Info.plist / Entitlements 映射

状态：模板已完成，真实工程映射未完成

依据：

- [`Info.plist.example`](/home/ps/claude/yinjie-app/apps/ios-shell/xcode-template/Info.plist.example)
- [`PrivacyInfo.xcprivacy.example`](/home/ps/claude/yinjie-app/apps/ios-shell/xcode-template/PrivacyInfo.xcprivacy.example)
- [`App.entitlements.example`](/home/ps/claude/yinjie-app/apps/ios-shell/xcode-template/App.entitlements.example)

---

## P1

这些项不一定阻断首版提审，但建议尽快补齐。

### P1-1 Push 能力

状态：未完成

说明：

消息类产品最终应支持推送，但首版若产品策略允许，可延后。

### P1-2 相机/相册/麦克风原生能力

状态：权限文案模板已完成，业务未接入

说明：

如果首版不启用，可不在审核阶段展示对应入口。

### P1-3 更完整的 Privacy Manifest

状态：模板已完成，细化未完成

说明：

随着采集范围和三方依赖变化，需要补充最终版本。

### P1-4 原生级键盘与状态栏优化

状态：Web 层已完成基础适配，原生桥未深度接入

说明：

当前 `visualViewport` 方案足以做第一轮验证，但真机可能还要继续调。

### P1-5 Deep Link / Universal Link

状态：未完成

说明：

可在后续版本作为分享与通知跳转增强项。

---

## 已完成的仓库内准备

### 架构与功能

1. iOS 渠道化入口
2. 远程 Core API 模式
3. 删除账号
4. 举报/屏蔽
5. 法务页
6. Safe Area
7. 基础键盘适配

### 壳与资料

1. `apps/ios-shell` 基础目录
2. plugin 规范与 stub
3. Xcode 模板
4. 提审草案
5. 真机回归清单

---

## 结论

当前仓库已经把“Linux 环境下能提前完成的 iOS 上架准备”基本做完了。

下一阶段的关键路径，已经主要转移到 macOS / Xcode / 真机环境：

1. 真正生成 iOS 工程
2. 接原生 plugin
3. 跑真机回归
4. 填 App Store Connect

可直接执行的入口文档：

- [`ios-macos-runbook.md`](/home/ps/claude/yinjie-app/docs/ios-macos-runbook.md)
