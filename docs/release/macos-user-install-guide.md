# macOS User Install Guide

日期：2026-04-06
适用范围：面向最终用户安装 `Yinjie.app`

## 1. 下载前先确认

先确认你的 Mac 架构：

- Apple Silicon：下载 `aarch64-apple-darwin` 对应产物
- Intel：下载 `x86_64-apple-darwin` 对应产物

如果你不确定：

- 打开“关于本机”
- 查看芯片或处理器信息

## 2. 安装步骤

1. 下载对应架构的 DMG
2. 打开 DMG
3. 将 `Yinjie.app` 拖入 `Applications`
4. 从 `Applications` 启动 `Yinjie.app`
5. 首次启动后等待桌面壳完成本地运行时检查

首次进入后，应用会检查：

- 本地 Core API
- runtime data 目录
- provider 配置

## 3. 正常启动时你会看到什么

正常情况下：

- 先进入 `/setup`
- 桌面壳自动尝试拉起内置 `core-api`
- Core API 可达后，继续登录或 onboarding

## 4. 如果启动失败

优先去看 `/setup` 或桌面启动引导层里的诊断信息。

重点看这些字段：

- `commandSource`
- `managedByDesktopShell`
- `managedChildPid`
- `desktopLogPath`
- `lastCoreApiError`

## 5. 常见问题

### 5.1 应用能打开，但一直卡在“正在唤醒你的本地世界”

先检查：

- `commandSource` 是否为 `bundled` 或 `bundled-sidecar`
- `managedByDesktopShell` 是否为 `true`
- `desktopLogPath` 指向的日志文件是否存在

如果 `commandSource` 不是 bundled：

- 说明应用没有优先使用包内 runtime
- 这通常意味着包内容不完整，优先重新下载对应架构版本

### 5.2 应用提示 health probe failed

这表示：

- 命令路径已解析
- 但本地 `core-api` 没有成功进入健康状态

处理顺序：

1. 在 `/setup` 里执行“重启 Core API”
2. 再执行“探活”
3. 查看 `lastCoreApiError`
4. 按 `desktopLogPath` 找到本地桌面日志

### 5.3 macOS 拦截应用打开

如果这是正式签名公证版本：

- 先确认你下载的是最新 release
- 再执行：

```bash
spctl --assess --type execute /Applications/Yinjie.app
```

如果这是内部测试包：

- 可能还未完成正式公证
- 这种情况下应联系发布方确认当前包是否为正式外发版本

## 6. 需要反馈给开发者的信息

如果要反馈问题，请至少带上：

- 你的 Mac 架构
- 下载的 release 版本
- `commandSource`
- `managedByDesktopShell`
- `managedChildPid`
- `desktopLogPath`
- `lastCoreApiError`

如果可以，再附上：

- `/setup` 页面截图
- `desktop.log` 关键报错
