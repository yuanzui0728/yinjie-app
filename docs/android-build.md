# Android Build

## 配置源

- Android 壳配置文件：`apps/android-shell/android-shell.config.json`
- 机器本地覆盖：`apps/android-shell/android-shell.config.local.json`
- 本地覆盖示例：`apps/android-shell/android-shell.config.local.example.json`
- Web 运行时默认值输出：`apps/app/public/runtime-config.json`

`android-shell.config.json` 当前负责：

- `appId`
- `appName`
- `versionCode`
- `versionName`
- `allowCleartextTraffic`
- `runtime.environment`
- `runtime.apiBaseUrl`
- `runtime.socketBaseUrl`

## 常用命令

- `pnpm android:configure`
- `pnpm android:init`
- `pnpm android:sync`
- `pnpm android:open`
- `pnpm android:apk`
- `pnpm android:bundle`
- `pnpm android:doctor`

## 推荐流程

1. 在 `apps/android-shell/android-shell.config.local.json` 填入本机或当前发布环境的 `apiBaseUrl`
2. 如需直连明文局域网地址，再临时把 `allowCleartextTraffic` 设为 `true`
3. 执行 `pnpm android:configure`
4. 首次接入原生工程时执行 `pnpm android:init`
5. 每次前端改动后执行 `pnpm android:sync`
6. 执行 `pnpm android:doctor`
7. 配置 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT`
8. 执行 `pnpm android:open`，在 Android Studio 中完成真机调试、签名和 release 构建

如需直接在命令行产出构建物：

- `pnpm android:apk`
- `pnpm android:bundle`

## Doctor 判定

`pnpm android:doctor` 当前会检查：

- `android-shell.config.json`
- `capacitor.config.json`
- `apps/app/public/runtime-config.json`
- `apps/app/dist`
- `apps/android-shell/android/`
- Java 运行时
- `ANDROID_HOME` / `ANDROID_SDK_ROOT`
- production 环境下是否已配置 `apiBaseUrl`
- production 环境下是否仍启用 cleartext traffic
- release 签名本地属性文件是否存在

## 当前约束

- Android 首发只支持远端 Core API 模式，不在本地设备托管 Core API
- 运行时地址会同时写入 Android manifest 元数据和 `apps/app/public/runtime-config.json`
- `pnpm android:sync` 与 `pnpm android:open` 前会自动执行配置下发
- Android manifest 显式关闭应用备份与 device transfer 数据导出
