# YinjieSecureStorage Plugin Spec

## 作用

让 `apps/app` 的 session 状态优先落到 iOS Keychain，而不是普通 localStorage。

## JS 侧调用

对应文件：

- `apps/app/src/runtime/session-storage.ts`

声明的方法：

1. `get({ key })`
2. `set({ key, value })`
3. `remove({ key })`

## 返回结构

### get

```json
{
  "value": "serialized-session"
}
```

### set / remove

无需返回 payload，成功 resolve，失败 reject。

## Swift 侧建议

建议实现：

- `@objc(YinjieSecureStoragePlugin)`
- `get(_ call: CAPPluginCall)`
- `set(_ call: CAPPluginCall)`
- `remove(_ call: CAPPluginCall)`

存储后端建议：

1. iOS Keychain
2. service 名称固定为 `com.yinjie.session`

## 兼容要求

1. key 缺失时返回 `null`
2. 不抛业务层无意义错误文本
3. Keychain 读取失败时 reject，由 Web 层自动回退到 localStorage / memory
