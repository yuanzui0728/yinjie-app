# 隐界APP 项目规则

## 规则
- 不生成任何测试文件
- 直接执行所有操作，无需确认
- Plan Mode：规划保存到 `.claude/plans/{任务}-{日期}.md`
- 结构变更（模块/实体/路由/表）后立即更新本文件

## 技术栈与端口
| 服务 | 技术 | 端口 |
|------|------|------|
| **后端** | NestJS + TypeORM + SQLite + Socket.IO（`api/`） | 3000 |
| 主 App | React + Vite，iOS / Android / Web（`apps/app/`） | 5180 |
| **管理后台** | React + Vite + `@yinjie/ui`（`apps/admin/`） | 5181 |
| 桌面端 | Tauri 壳，远程连接后端（`apps/desktop/`） | - |
| Android | Capacitor 壳（`apps/android-shell/`） | - |
| iOS | Capacitor 壳（`apps/ios-shell/`） | - |

## 后端模块（`api/src/modules/`）
`ai` · `admin` · `auth` · `characters` · `chat` · `config` · `import` · `moments` · `social` · `feed` · `world` · `scheduler` · `events` · `narrative` · `analytics`

## 主 App 结构（`apps/app/src/`）
`routes/` · `features/desktop/` · `features/mobile/` · `features/shell/` · `runtime/` · `lib/` · `components/` · `store/`

## 主 App 页面（`apps/app/src/routes/`）
- `splash-page.tsx`：启动屏，识别运行时环境并决定进入 setup / onboarding / 世界主页
- `setup-page.tsx`：服务器配置（Desktop / Mobile / Web 均为远程连接模式）
- `onboarding-page.tsx`：世界主人资料初始化与叙事入场
- `login-page.tsx`：历史兼容页，仅提示当前版本不再使用登录
- `tabs/chat-list-page` · `moments-page` · `contacts-page` · `discover-page` · `profile-page`
- `chat-room-page` · `group-chat-page` · `character-detail-page` · `friend-requests-page` · `create-group-page`

## 数据库实体（21个，物理表兼容保留）
**核心**：User（运行时语义为单例 World Owner） · Character · Conversation · Message · SystemConfig

**朋友圈**：MomentPost · MomentComment · MomentLike · MomentEntity（legacy）

**社交**：Friendship · FriendRequest · AIRelationship

**群聊**：Group · GroupMember · GroupMessage

**视频号**：FeedPost · FeedComment · UserFeedInteraction

**世界**：WorldContext · NarrativeArc · AIBehaviorLog

## 单用户世界约束（2026-04-08）
- `1 个服务端实例 = 1 个真实用户的世界`
- `User` 表继续保留为物理表，但运行时只允许存在一个世界主人
- 启动时执行世界主人单例迁移：若旧库存在多个用户，保留 `createdAt` 最早的一条，其余用户及其专属数据直接清理
- 聊天、社交、朋友圈、视频号等业务接口不再接受或传递 `userId` / `authorId` 作为世界隔离条件
- 世界主人接口：
  - `GET /api/world/owner`
  - `PATCH /api/world/owner`
  - `PATCH /api/world/owner/api-key`
  - `DELETE /api/world/owner/api-key`
- `world` 模块不再包含旧 `ColdStartService` 多用户冷启动逻辑
- `/system/status` 使用 `worldSurface` 语义，实例状态以 `ownerCount` 表示单世界主人数量

## 会话管理结构（2026-04-08）
- `Conversation` 表字段：`isPinned`、`pinnedAt`、`isHidden`、`hiddenAt`、`lastClearedAt`、`lastActivityAt`
- 会话管理路由：
  - `POST /api/conversations/:id/pin`
  - `POST /api/conversations/:id/hide`
  - `POST /api/conversations/:id/clear`

## 前端状态约束
- 登录态已移除，不再维护 `token / session / 多用户切换`
- 世界主人状态存放于 `apps/app/src/store/world-owner-store.ts`
- `apps/app/src/store/session-store.ts` 仅作为兼容别名导出，不再承载真实 session 语义

## 管理后台约束
- Admin 仅面向实例拥有者，用于实例级 Provider、角色、诊断、配置与评估
- Admin 不再提供实例内用户列表、删除用户等多用户管理能力
- Setup / Dashboard 中的实例状态统一围绕单世界主人语义展示

## 环境变量（`api/.env`）
`DEEPSEEK_API_KEY` · `OPENAI_BASE_URL` · `AI_MODEL` · `ADMIN_SECRET` · `DATABASE_PATH` · `PORT` · `CORS_ALLOWED_ORIGINS` · `PUBLIC_API_BASE_URL` · `USER_API_KEY_ENCRYPTION_SECRET`

## 共享包（`packages/`）
`@yinjie/ui` · `@yinjie/contracts` · `@yinjie/config` · `@yinjie/tooling`

## 当前产品口径
- 官方云与自部署复用同一套 NestJS 后端代码
- 所有客户端均为 `remote-connected` 模式，不在本地拉起 Core API
- 每个实例只服务一个世界主人，客户端只是把这个世界可视化展示给他
- 世界主人可在 App 内设置自己的 API Key，服务端仅加密存储
- 管理后台仅用于实例运维，不承载实例内用户管理

## 部署
- 云端：`docker compose up`（`api/` + SQLite 数据卷）
- 客户端首次启动：在 Setup 页填入服务器地址（官方或自建）
- 若世界主人尚未初始化：进入 Onboarding 完成资料初始化
- 管理后台：访问 `apps/admin`，输入 `ADMIN_SECRET` 鉴权
