# iOS Build Guide

日期：2026-04-06
范围：`apps/app` + `apps/ios-shell`

## 目标

把当前 `apps/app` Web UI 通过 `apps/ios-shell` 打进 iOS 原生壳，并为后续真机调试、签名和提审做准备。

## 当前结构

- Web UI：`apps/app`
- iOS 壳：`apps/ios-shell`
- 远程 Core API：通过 `VITE_CORE_API_BASE_URL` 注入

## 前置条件

1. macOS
2. Xcode
3. CocoaPods
4. Node.js / pnpm

## 建议环境变量

### Web 层

- `VITE_APP_PLATFORM=ios`
- `VITE_CORE_API_BASE_URL=https://your-core-api.example.com`
- `VITE_SOCKET_BASE_URL=https://your-core-api.example.com`

### 壳层

- `YINJIE_IOS_CORE_API_BASE_URL=https://your-core-api.example.com`

## 基本流程

1. 安装依赖

```bash
pnpm --dir apps/ios-shell install
```

2. 构建 Web 产物

```bash
pnpm --dir apps/app build
```

3. 同步到 iOS 壳

```bash
pnpm ios:sync
```

4. 预检查与模板复制

```bash
pnpm ios:doctor
pnpm ios:configure
```

5. 打开 Xcode

```bash
pnpm ios:open
```

## Xcode 内需要继续完成的事项

1. 选择 Team 与签名
2. 配置 Bundle Identifier
3. 配置 Keychain / Associated Domains / Push 等 Capabilities
4. 补充权限文案与 Privacy Manifest
5. 配置 App Icon、Launch Screen、截图与版本号

## 当前已完成

1. Web 端已支持 `ios` 平台识别
2. `viewport-fit=cover` 与 Safe Area 基础适配已接入
3. 聊天输入区会依据 `visualViewport` 计算键盘占位
4. iOS 壳基础目录和脚本已建立
5. `YinjieRuntime` / `YinjieSecureStorage` plugin 规范与 Swift stub 已写入 `apps/ios-shell/plugins/`

## 下一步建议

1. 把 `YinjieRuntime` / `YinjieSecureStorage` stub 接入真实 Xcode 工程
2. 接入 Capacitor `Keyboard` / `StatusBar` / `SplashScreen` 真正原生桥
3. 完成 iOS 真机调试

## 进一步执行文档

1. `docs/ios-plugin-implementation-guide.md`
2. `docs/ios-xcode-integration-checklist.md`
3. `docs/ios-device-regression-checklist.md`
4. `docs/ios-macos-runbook.md`
