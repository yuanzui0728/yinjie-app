# iOS Plugin Implementation Guide

日期：2026-04-06
范围：`apps/app` + `apps/ios-shell/plugins/`

## 目标

把 `YinjieRuntime` 与 `YinjieSecureStorage` 的真实接线步骤细化到可直接在 macOS/Xcode 环境执行。

---

## 1. YinjieRuntime

### 1.1 作用

向 Web 层提供：

1. `apiBaseUrl`
2. `socketBaseUrl`
3. `environment`
4. `publicAppName`
5. `applicationId`

对应 Web 调用位置：

- [`native-runtime.ts`](/home/ps/claude/yinjie-app/apps/app/src/runtime/native-runtime.ts)

### 1.2 推荐接线方式

1. 在 Capacitor iOS 工程中创建 `YinjieRuntimePlugin.swift`
2. 让 plugin 从以下优先级读取配置：
   - `Info.plist`
   - App Group/本地配置文件
   - fallback 到默认值
3. 保持返回字段和 JS 侧定义完全一致

### 1.3 Info.plist 建议键

建议添加：

- `YinjieApiBaseUrl`
- `YinjieSocketBaseUrl`
- `YinjieEnvironment`
- `YinjiePublicAppName`

### 1.4 实施步骤

1. 将 [`YinjieRuntimePlugin.swift`](/home/ps/claude/yinjie-app/apps/ios-shell/plugins/swift-stub/YinjieRuntimePlugin.swift) 复制到真实 iOS 工程
2. 在 `Info.plist` 中加入上述配置键
3. 在 `getConfig` 中读取 `Bundle.main.object(forInfoDictionaryKey:)`
4. 用真机启动后确认 `readNativeRuntimeConfig()` 返回非空
5. 验证 app 在无 `runtime-config.json` 情况下仍能拿到正确远程地址

### 1.5 验收

1. `apiBaseUrl` 与 `socketBaseUrl` 为正式远程地址
2. 删除 `runtime-config.json` 后 app 仍可运行
3. 切换 Release/Debug 环境时可返回不同 environment

---

## 2. YinjieSecureStorage

### 2.1 作用

将 session 状态从普通 Web Storage 迁到 iOS Keychain。

对应 Web 调用位置：

- [`session-storage.ts`](/home/ps/claude/yinjie-app/apps/app/src/runtime/session-storage.ts)

### 2.2 推荐存储策略

1. 使用 Keychain
2. service 固定为 `com.yinjie.session`
3. account 使用传入的 `key`
4. value 使用原始字符串，不做二次 JSON 包装

### 2.3 实施步骤

1. 将 [`YinjieSecureStoragePlugin.swift`](/home/ps/claude/yinjie-app/apps/ios-shell/plugins/swift-stub/YinjieSecureStoragePlugin.swift) 复制到真实 iOS 工程
2. 引入 Keychain 读写逻辑
3. 实现：
   - `get`
   - `set`
   - `remove`
4. 在 iPhone 真机执行：
   - 登录
   - 杀进程
   - 重启 app
   - 验证 session 是否恢复

### 2.4 Keychain 行为要求

1. key 不存在时返回 `{ value: null }`
2. 存储失败时 reject，让 Web 层自动回退
3. 删除账号后必须同步清空对应 key
4. 卸载重装后 session 不应错误复活

### 2.5 验收

1. 登录态不再只依赖 localStorage
2. 杀进程恢复成功
3. 删除账号和退出登录后 Keychain 中对应 key 被清除

---

## 3. Capacitor / Xcode 侧共同检查

1. plugin class 名与 `registerPlugin()` 名称一致
2. plugin 被加入 target membership
3. 签名、Bundle Identifier 和 entitlements 已正确配置
4. Debug 与 Release 都能找到 plugin

---

## 4. 实现后要回归的最小路径

1. 打开 App
2. login/onboarding
3. 杀进程重启
4. 单聊发送消息
5. 退出登录
6. 删除账号
7. 再次打开 App，确认无旧会话残留
