# Windows 桌面构建说明

## 目标

为 `apps/desktop` 产出可安装的 Windows 桌面安装包，并确保安装包内包含 `yinjie-core-api.exe` sidecar。

## 前置依赖

- Node.js
- pnpm
- Rust toolchain
- Rust target: `x86_64-pc-windows-msvc`
- Visual Studio Build Tools
  - MSVC C++ toolchain
  - Windows SDK
- Microsoft WebView2 Runtime

## 构建命令

在仓库根目录执行：

```bash
pnpm --filter @yinjie/desktop build:windows:x64
```

桌面脚本会在 Windows 下自动执行：

1. 构建 `crates/core-api`
2. 把产物复制到 `apps/desktop/src-tauri/binaries/yinjie-core-api-<target>.exe`
3. 调用 `tauri build`

## sidecar 解析顺序

桌面壳启动 Core API 的顺序如下：

1. `YINJIE_CORE_API_CMD`
2. 安装包内 bundled sidecar
3. `PATH` 中的 `yinjie-core-api(.exe)`

这意味着：

- 安装态默认不需要手工配置 PATH
- 开发态仍可通过 `YINJIE_CORE_API_CMD` 覆盖启动命令

## 诊断

桌面运行时 diagnostics 当前会返回：

- `coreApiCommand`
- `coreApiCommandSource`
- `coreApiReachable`
- `diagnosticsStatus`
- `bundledCoreApiPath`
- `bundledCoreApiExists`
- `coreApiPortOccupied`
- `lastCoreApiError`

`diagnosticsStatus` 当前可能出现：

- `ready`
- `bundled-sidecar-missing`
- `command-missing`
- `port-occupied`
- `spawn-failed`
- `health-probe-failed`

如果启动失败，桌面层还会把错误写入：

- `runtime-data/logs/desktop.log`

## 首轮验收

- 安装后首启能自动拉起 Core API
- `%AppData%` 下出现 `runtime-data/yinjie.sqlite`
- `%AppData%` 下出现 `runtime-data/logs/desktop.log`
- setup 页能看到 `bundled sidecar` 或 `sidecar ready`
