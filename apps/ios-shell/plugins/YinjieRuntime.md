# YinjieRuntime Plugin Spec

## 作用

向 Web 层提供运行时配置，不把远程 Core API 地址、环境标识硬编码在前端 bundle 内。

## JS 侧调用

对应文件：

- `apps/app/src/runtime/native-runtime.ts`

调用形式：

```ts
registerPlugin("YinjieRuntime").getConfig()
```

## 期望返回

```json
{
  "apiBaseUrl": "https://api.example.yinjie.app",
  "socketBaseUrl": "https://api.example.yinjie.app",
  "environment": "production",
  "publicAppName": "Yinjie",
  "applicationId": "com.yinjie.ios"
}
```

## Swift 侧建议

建议实现：

- `@objc(YinjieRuntimePlugin)`
- `getConfig(_ call: CAPPluginCall)`

数据来源建议：

1. `Info.plist`
2. App Group 配置
3. 本地 JSON 配置文件

## 失败策略

如果 plugin 未接通，Web 层会自动回退到 `/runtime-config.json`。
