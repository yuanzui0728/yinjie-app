# macOS Desktop Release Checklist

日期：2026-04-06
适用范围：`apps/desktop` 的 mac 打包、签名、公证、安装验收与回滚排查

## 1. 发版前

发版前必须确认：

- `apps/desktop/src-tauri/icons/icon.icns` 已存在且为正式资产
- `apps/desktop/src-tauri/tauri.conf.json` 中 `externalBin` 仍包含 `binaries/yinjie-core-api`
- `apps/desktop/scripts/run-tauri.mjs` 仍会把 `--target` 透传给 sidecar 准备脚本
- `crates/core-api` 能在目标 target 上通过 `cargo check`
- `pnpm typecheck` 通过
- `pnpm build` 通过

如果走 GitHub Actions，还要确认：

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_API_KEY`
- `APPLE_API_ISSUER`

至少在仓库 secrets 中存在并且未过期。

## 2. 触发策略

推荐触发方式：

- 日常验证：`workflow_dispatch` + `target_mode=single` + `aarch64-apple-darwin`
- 正式发版：push `desktop-v*` tag，默认双架构

说明：

- 手工单架构用于快速验证和修复
- tag 发版默认走双架构，避免正式 release 只产出单端包
- tag 名必须与 `apps/desktop/src-tauri/tauri.conf.json` 中的 `version` 一致

## 3. 构建完成后检查

每个 target 都要确认 workflow artifact 中存在：

- `.app.tar.gz`
- `.dmg`
- `.sig`
- `yinjie-desktop-<version>-<target>`
- `yinjie-desktop-diagnostics-<version>-<target>`
- `yinjie-desktop-release-manifest-<version>`
- `yinjie-desktop-release-notes-<version>`

并确认 bundle 目录下至少有一份：

- `macos/*.app`
或
- `dmg/*.dmg`

如果缺任一项，不进入安装验收。

## 4. 安装验收

在真实 mac 上执行：

1. 下载 DMG
2. 拖入 `Applications`
3. 启动 `Yinjie.app`
4. 确认进入 `/setup`
5. 确认桌面壳自动拉起内置 `core-api`
6. 确认 `/health` 可达
7. 保存 provider 配置
8. 完成一次登录或 onboarding
9. 重启应用
10. 确认 runtime 状态与 session 恢复

额外命令校验：

```bash
codesign --verify --deep --strict /Applications/Yinjie.app
spctl --assess --type execute /Applications/Yinjie.app
```

重点观察的 runtime signals：

- `desktopStatus.message`
- `desktopStatus.command`
- `desktopStatus.commandSource`
- `desktopStatus.managedByDesktopShell`
- `runtimeDiagnostics.diagnosticsStatus`
- `runtimeDiagnostics.managedByDesktopShell`
- `runtimeDiagnostics.managedChildPid`
- `runtimeDiagnostics.desktopLogPath`
- `runtimeDiagnostics.lastCoreApiError`

## 5. 常见失败排查

### 5.1 构建阶段找不到 bundle

检查：

- `apps/desktop/src-tauri/target/<target>/release/bundle` 是否存在
- Tauri build 是否被前置步骤中断
- `icon.icns` 是否有效
- `externalBin` 是否指向正确路径

### 5.2 应用能启动但 Core API 没拉起

检查：

- `apps/desktop/src-tauri/binaries/yinjie-core-api-<target>` 是否被正确打进包
- 桌面运行时诊断里 `commandSource` 是否为 `bundled-sidecar`
- 桌面运行时诊断里 `managedByDesktopShell` 是否为 `false`
- 桌面运行时诊断里 `desktopLogPath` 对应文件是否存在
- 是否被 `YINJIE_CORE_API_CMD` 意外覆盖
- `core-api` 对应 target 是否编错架构

### 5.3 签名失败

检查：

- `APPLE_CERTIFICATE` 是否为 base64 编码的 `.p12`
- `APPLE_CERTIFICATE_PASSWORD` 是否正确
- `APPLE_SIGNING_IDENTITY` 是否与证书匹配
- workflow 中临时 keychain 是否创建成功

### 5.4 公证失败

检查：

- `APPLE_API_KEY` 内容是否完整
- `APPLE_API_ISSUER` 是否匹配
- Apple 开发者权限是否允许 notarization
- Tauri bundler 日志中是否出现 notarization rejection 原因

### 5.5 Gatekeeper 仍拦截

检查：

- 是否真的完成 notarization
- 是否对最终分发产物执行了 stapling
- 用户机器下载的是否是旧包

## 6. 回滚条件

满足任一条件建议回滚：

- 任一主目标架构包无法启动
- 应用能打开但内置 `core-api` 无法自动拉起
- provider 配置无法保存
- 重启后 session 或 runtime 无法恢复
- `codesign --verify` 或 `spctl --assess` 失败

## 7. 发布后记录

每次正式发版后至少记录：

- git tag
- workflow run 链接
- 产物 target 列表
- diagnostics artifact 链接
- 是否签名成功
- 是否 notarization 成功
- 首轮 smoke 验收结果
- 已知问题与回补计划

## 8. 失败后优先回看的 CI 资料

失败后先看：

- job summary 中的 `Bundled Sidecars`
- job summary 中的 `Bundle Files`
- artifact `yinjie-desktop-diagnostics-<version>-<target>`
- artifact `yinjie-desktop-release-manifest-<version>`
- artifact `yinjie-desktop-release-notes-<version>`

其中重点文件：

- `build-context.txt`
- `bundle-files.txt`
- `sidecar-files.txt`
- `target-artifacts.txt`
