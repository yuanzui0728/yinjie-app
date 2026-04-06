# Android Release Checklist

## 配置

- 在 `apps/android-shell/android-shell.config.local.json` 填入 release 使用的 `runtime.apiBaseUrl`
- 确认 `runtime.environment` 为 `production`
- 确认 `allowCleartextTraffic` 为 `false`
- 确认 `versionCode` 与 `versionName` 已递增

## 本地环境

- 配置 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT`
- 安装 Android SDK Platform / Build Tools / Platform Tools
- 准备上传签名 keystore
- 在 `apps/android-shell/android-signing.local.properties` 填入签名信息

签名文件格式：

```properties
YINJIE_UPLOAD_STORE_FILE=../keystores/yinjie-upload.jks
YINJIE_UPLOAD_STORE_PASSWORD=replace-me
YINJIE_UPLOAD_KEY_ALIAS=yinjie-upload
YINJIE_UPLOAD_KEY_PASSWORD=replace-me
```

## 产物流程

1. 执行 `pnpm android:doctor`
2. 执行 `pnpm android:bundle`
3. 在 Android Studio 或 `bundletool` 验证生成的 `aab`
4. 校验应用名、图标、启动图、版本号、服务地址、登录、聊天、动态、资料页运行环境信息

## 提审前核对

- 不存在开发或局域网地址
- 不存在明文 HTTP 流量依赖
- Android 备份与 device transfer 数据导出保持关闭
- Onboarding / Login / Setup 未登录流可直接访问隐私政策、用户协议、社区规范
- Profile 页显示的 `applicationId / appVersionName / environment` 正确
- Provider 未就绪时远端 fallback 文案仍可正常工作
- 法务页面、隐私政策、社区规范、服务条款可访问
