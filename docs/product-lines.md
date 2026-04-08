# 隐界多端产品线说明

日期：2026-04-08

## 当前结论

隐界不再区分“桌面宿主端”和“移动连接端”两种不同运行模型。

当前统一口径是：
- Windows / macOS：Tauri 客户端
- iOS / Android：Capacitor 客户端
- Web：浏览器客户端

它们都连接同一个远程 NestJS 实例，无论该实例部署在官方云还是用户自己的服务器。

## 统一原则

- 所有端都是 remote-connected client
- 不在本地拉起 Core API
- 不在客户端本地保存用户 API Key 明文副本作为服务端配置来源
- 登录、聊天、社交、个人 API Key 设置共用 `apps/app` 业务前端
- 原生壳只负责窗口、深链、安全存储、诊断和平台桥接

## 代码落点

### 共享前端
- `apps/app`
- `packages/contracts`
- `packages/config`
- `packages/ui`

### 桌面壳
- `apps/desktop`

### Android 壳
- `apps/android-shell`

### iOS 壳
- `apps/ios-shell`

### 管理后台
- `apps/admin`

## 首次启动流程

1. `Splash`
2. `Setup`
3. 填写服务器地址
4. 登录或进入 Onboarding
5. 进入聊天与社交流程

## 管理职责

### 普通用户
- 只使用 App 或桌面端
- 登录自己的实例
- 可选配置自己的 API Key

### 实例拥有者
- 部署后端
- 配置实例默认 Provider
- 使用管理后台查看系统状态、用户列表和诊断信息

## 后续约束

- 新功能默认按远程实例接入设计
- 不再新增任何本地宿主依赖
- 文档、发布流程、回归清单统一以远程接入为基准
