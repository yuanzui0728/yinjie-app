# Windows VM Runbook

日期：2026-04-06
目标：在一台干净 Windows VM 上完成 `W202 / W203 / W204 / W205`

## 1. VM 基线

建议环境：

- Windows 11 x64
- 快照一：纯净系统
- 快照二：安装完桌面前置依赖

建议预装：

- Edge / WebView2 Runtime
- 7-Zip
- PowerShell 7

## 2. 构建阶段

如果走 CI artifact：

1. 打开最新 `windows-desktop` workflow
2. 下载 artifact
3. 解压到 VM 本地目录
4. 记录安装包文件名与类型

如果走本地构建：

1. 安装 Node.js
2. 安装 pnpm
3. 安装 Rust
4. 执行 `rustup target add x86_64-pc-windows-msvc`
5. 安装 Visual Studio Build Tools + Windows SDK
6. 在仓库根目录执行：

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm desktop:build:windows:x64
```

## 3. W202 安装包产物确认

必须记录：

- 安装包完整文件名
- 安装包类型：`.msi` / `.exe`
- 文件大小
- bundle 目录内容截图或记录

必须确认：

- 至少有一份可安装产物
- sidecar 被打进安装包

## 4. W203 首启验证

准备条件：

- 新 VM 快照
- 不安装 Rust
- 不配置 PATH
- 不设置 `YINJIE_CORE_API_CMD`

执行步骤：

1. 安装应用
2. 首次启动应用
3. 进入 `/setup`
4. 等待自动拉起 Core API
5. 查看桌面诊断卡片
6. 查看 `%AppData%` 下 runtime data
7. 保存 provider 配置
8. 登录或完成 onboarding
9. 进入聊天页

必须确认：

- `diagnosticsStatus = ready`
- `coreApiCommandSource = bundled`
- `bundledCoreApiExists = true`
- `%AppData%/runtime-data/yinjie.sqlite` 已生成
- `%AppData%/runtime-data/logs/core-api.log` 已生成
- `%AppData%/runtime-data/logs/desktop.log` 已生成

## 5. W204 升级安装验证

执行步骤：

1. 安装旧版本
2. 打开应用并产生本地数据
3. 保存 provider 配置
4. 关闭应用
5. 安装新版本覆盖旧版本
6. 重启应用

必须确认：

- 原有数据仍在
- provider 配置仍在
- Core API 仍自动拉起
- setup 不要求重新初始化

## 6. W205 卸载验证

执行步骤：

1. 卸载应用
2. 检查安装目录
3. 检查 `%AppData%/runtime-data`
4. 记录实际行为

必须记录：

- 程序目录是否已移除
- 用户数据是否保留
- 当前行为是否符合“卸载默认保留 AppData/runtime-data”的预期

## 7. 失败优先排查

优先检查：

- `/setup` 中 `diagnosticsStatus`
- `%AppData%/runtime-data/logs/desktop.log`
- `%AppData%/runtime-data/logs/core-api.log`

常见状态：

- `bundled-sidecar-missing`
- `command-missing`
- `port-occupied`
- `spawn-failed`
- `health-probe-failed`

## 8. 交付结果模板

每次执行结束后至少记录：

- VM 名称 / 快照名
- 安装包版本
- W202 结果
- W203 结果
- W204 结果
- W205 结果
- 问题截图
- 日志路径
