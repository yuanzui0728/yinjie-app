# Windows 安装验收清单

日期：2026-04-05

## A. 构建产物检查

- CI 或本地构建成功执行 `pnpm desktop:build`
- 产物目录中存在 `.msi` 或 `.exe` 安装包
- 安装包内包含桌面壳主程序
- 安装包内包含 `yinjie-core-api.exe` sidecar

## B. 全新机器安装检查

- 目标机器未安装 Rust
- 未手工设置 `YINJIE_CORE_API_CMD`
- 未手工把 `yinjie-core-api.exe` 加入 PATH
- 安装程序可正常执行
- 安装完成后可从开始菜单启动应用

## C. 首启检查

- 首次打开桌面应用时，窗口能正常显示
- Core API 能被桌面壳自动拉起
- Setup 页不再停留在“命令缺失”
- 桌面诊断中能看到：
  - `bundled sidecar` 或 `sidecar ready`
  - 正确的 `coreApiCommand`
  - `coreApiCommandSource`
- `%AppData%` 下生成 `runtime-data/yinjie.sqlite`
- `%AppData%` 下生成 `runtime-data/logs/core-api.log`
- `%AppData%` 下生成 `runtime-data/logs/desktop.log`

## D. 基础业务检查

- `/setup` 可读取本地状态
- provider 保存可用
- provider test 可用
- onboarding 可进入
- login 可进入
- chat list 可打开
- chat room 可打开
- `/chat` Socket.IO 可收发消息
- admin `/setup` 可打开
- admin dashboard 可查看 runtime diagnostics

## E. 异常检查

- sidecar 缺失时 UI 能提示 `sidecar missing`
- sidecar 启动失败时 diagnostics 有 `lastCoreApiError`
- `runtime-data/logs/desktop.log` 中可看到启动失败记录
- Core API 已运行但未受桌面壳托管时状态文案合理

## F. 升级与卸载检查

- 安装旧版本并产生本地数据
- 覆盖安装新版本后，SQLite 与日志仍保留
- 卸载后主程序目录按预期清理
- 卸载后 `AppData/runtime-data` 的行为与产品预期一致
