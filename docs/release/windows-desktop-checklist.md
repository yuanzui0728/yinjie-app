# Windows Desktop Release Checklist

日期：2026-04-06
适用范围：`apps/desktop` 的 Windows 打包、安装、首启验证、升级与卸载检查

## 1. 发版前

发版前必须确认：

- `apps/desktop/src-tauri/tauri.conf.json` 中 `bundle.externalBin` 仍包含 `binaries/yinjie-core-api`
- `apps/desktop/scripts/run-tauri.mjs` 会把 `--target` 透传给 sidecar 准备脚本和 `tauri build`
- `apps/desktop/scripts/prepare-core-api-sidecar.mjs` 会为当前 Windows target 生成 `yinjie-core-api-<target>.exe`
- `pnpm typecheck` 通过
- `pnpm build` 通过
- Windows workflow `windows-desktop.yml` 可用

如果准备正式外发，还要确认：

- 代码签名证书可用
- 签名私钥托管方案已确认
- 是否启用 updater 已有结论

## 2. 构建触发方式

推荐触发方式：

- 本地 Windows 验证：`pnpm --filter @yinjie/desktop build:windows:x64`
- CI 验证：手工触发 `windows-desktop` workflow
- 发版前验证：以 release commit 或 tag 触发 workflow，下载 artifact 复验

## 3. 构建完成后检查

每次构建后至少确认：

- bundle 目录下存在 Windows 安装产物
- 安装产物类型符合预期：`.msi` 或 `.exe`
- workflow artifact 可下载
- build 日志中没有 sidecar missing 相关报错

如果在 Windows 本机构建，还要额外确认：

- `apps/desktop/src-tauri/binaries/` 下存在 `yinjie-core-api-x86_64-pc-windows-msvc.exe`

## 4. 安装验收

在一台全新 Windows 机器或干净 VM 上执行：

1. 不安装 Rust
2. 不设置 `YINJIE_CORE_API_CMD`
3. 不手工把 `yinjie-core-api.exe` 加入 PATH
4. 安装桌面应用
5. 启动应用
6. 进入 `/setup`
7. 确认桌面壳自动拉起内置 Core API
8. 确认 `%AppData%` 下出现 `runtime-data/yinjie.sqlite`
9. 确认 `%AppData%` 下出现 `runtime-data/logs/core-api.log`
10. 确认 `%AppData%` 下出现 `runtime-data/logs/desktop.log`
11. 保存 provider 配置
12. 完成一次 onboarding 或 login
13. 打开聊天页并完成一次 Socket 连通验证

## 5. 桌面诊断检查

`/setup` 或 guard 中至少确认：

- `diagnosticsStatus` 为 `ready`
- `coreApiCommandSource` 为 `bundled` 或明确的预期值
- `bundledCoreApiExists` 为 `true`
- `coreApiReachable` 为 `true`

如果失败，优先按以下状态排查：

- `bundled-sidecar-missing`
- `command-missing`
- `port-occupied`
- `spawn-failed`
- `health-probe-failed`

## 6. 升级安装检查

执行：

1. 安装旧版本
2. 写入一份真实本地数据
3. 保存 provider 配置
4. 生成日志
5. 覆盖安装新版本
6. 重新启动应用

必须确认：

- 旧数据仍可读取
- SQLite 未丢失
- provider 配置仍存在
- 桌面壳仍能自动拉起 Core API

## 7. 卸载检查

执行：

1. 卸载应用
2. 检查安装目录是否清理
3. 检查 `%AppData%/runtime-data` 是否保留

必须记录：

- 主程序目录是否清除
- 用户数据是否保留
- 当前行为是否与产品预期一致

## 8. 回滚条件

满足任一条件建议回滚：

- 安装包无法完成安装
- 应用能打开但内置 `core-api` 无法自动拉起
- `diagnosticsStatus` 长期不是 `ready`
- 登录、聊天、provider 配置不可用
- 升级安装导致数据丢失
- 卸载行为与文档不一致

## 9. 发布后记录

每次发版后至少记录：

- git commit / tag
- workflow run 链接
- artifact 名称
- 安装包类型
- 首轮安装验收结果
- 升级安装结果
- 卸载结果
- 已知问题与补救计划
