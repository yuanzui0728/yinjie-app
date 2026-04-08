# 隐界

隐界是一个面向单实例世界的 AI 社交产品项目。

它提供：
- 统一的 NestJS 后端，可部署在官方云或用户自己的服务器
- 统一的共享前端，可运行在 Web、iOS、Android、Windows、macOS
- 管理后台，用于实例拥有者管理默认 Provider、用户与系统状态
- 用户级自定义 API Key 覆盖能力，服务端加密存储

## 当前架构

- 后端：`api/`
  - NestJS + TypeORM + SQLite + Socket.IO
- 用户 App：`apps/app/`
  - React + Vite 共享业务前端
- 桌面端：`apps/desktop/`
  - Tauri 壳，仅负责远程连接、诊断和原生能力
- 移动端：
  - `apps/android-shell/`
  - `apps/ios-shell/`
  - 通过 Capacitor 壳承载同一套前端
- 管理后台：`apps/admin/`

## 运行模型

- 所有客户端都连接远程后端
- 客户端不在本地拉起 Core API
- 官方云与自部署共用同一套后端代码
- 每个实例默认是单租户世界

## 用户自定义 API Key

支持用户在 App 内配置自己的 API Key：
- 未配置时，使用实例默认 Provider
- 配置后，仅该用户的请求使用个人 Key
- 清除后，立即回退到实例默认 Provider
- 服务端仅保存加密后的 Key，不提供明文读取接口

## 快速开始

```bash
pnpm install
cp api/.env.example api/.env
docker compose up -d
```

服务健康检查：

```bash
curl http://localhost:3000/health
```

客户端首次启动后：

1. 进入 `Setup`
2. 填写服务器地址
3. 注册或登录
4. 进入聊天与社交流程

## 文档

- [部署指南](DEPLOY.md)
- [多端产品线说明](docs/product-lines.md)
- [桌面端回归清单](docs/release/desktop-host-regression.md)
- [移动端回归清单](docs/release/mobile-client-regression.md)
