# 隐界

隐界是一个面向“单用户世界实例”的 AI 社交产品项目。

核心口径：
- `1 个服务端实例 = 1 个真实用户的世界`
- `app / web / desktop / mobile shell` 都只是连接这个世界的可视化壳
- 官方云与自部署复用同一套 NestJS 后端代码
- 世界主人可为自己的请求配置专属 API Key，服务端仅加密存储
- 管理后台只负责实例运维，不再承载实例内用户管理

## 当前架构

- 后端：`api/`
  - NestJS + TypeORM + SQLite + Socket.IO
- 用户 App：`apps/app/`
  - React + Vite 共享业务前端
- 桌面端：`apps/desktop/`
  - Tauri 壳，远程连接世界实例
- 移动端：
  - `apps/android-shell/`
  - `apps/ios-shell/`
  - 通过 Capacitor 壳承载同一套前端
- 管理后台：`apps/admin/`

## 运行模型

- 所有客户端都连接远程后端
- 客户端不在本地拉起 Core API
- 服务端启动时会执行“世界主人单例迁移”
  - 若旧库中有多个用户，只保留 `createdAt` 最早的一条作为世界主人
  - 其余用户及其专属数据会被清理，不做自动合并
- 聊天、社交、朋友圈、视频号等业务不再依赖 `userId` 选世界

## 世界主人 API

```http
GET    /api/world/owner
PATCH  /api/world/owner
PATCH  /api/world/owner/api-key
DELETE /api/world/owner/api-key
```

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
2. 填写世界实例地址
3. 若尚未初始化主人资料，进入 `Onboarding`
4. 进入聊天、社交与世界内容流

## 文档

- [部署指南](DEPLOY.md)
- [多端产品线说明](docs/product-lines.md)
- [桌面端回归清单](docs/release/desktop-host-regression.md)
- [移动端回归清单](docs/release/mobile-client-regression.md)
