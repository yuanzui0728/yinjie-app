# 隐界APP 项目规则

## 规则
- 不生成任何测试文件
- 直接执行所有操作，无需确认
- Plan Mode：规划保存到 `.claude/plans/{任务}-{日期}.md`
- 结构变更（模块/实体/路由/表）后立即更新本文件

## 技术栈与端口
| 服务 | 技术 | 端口 |
|------|------|------|
| **后端 ★** | NestJS + TypeORM + SQLite + Socket.IO（api/） | 3000 |
| 主 App | React + Vite，iOS/Android/Web（apps/app/） | 5180 |
| **管理后台** | React + Vite + @yinjie/ui（apps/admin/） | 5181 |
| 桌面端 | Tauri 壳，远程连接后端（apps/desktop/） | - |
| Android | Capacitor 壳（apps/android-shell/） | - |
| iOS | Capacitor 壳（apps/ios-shell/） | - |

## 后端模块（api/src/modules/）
`ai` · `admin` · `auth` · `characters` · `chat` · `config` · `import` · `moments` · `social` · `feed` · `world` · `scheduler` · `events` · `narrative` · `analytics`

## 主 App 结构（apps/app/src/）
`routes/` · `features/desktop/` · `features/mobile/` · `features/shell/` · `runtime/` · `lib/` · `components/` · `store/`

## 主 App 页面（apps/app/src/routes/）
- `splash-page.tsx` — 启动屏，识别运行时环境
- `setup-page.tsx` — 服务器配置（Desktop/Mobile 均为远程连接模式）
- `onboarding-page.tsx` — 叙事入场流程
- `login-page.tsx` — 传统登录
- `tabs/chat-list-page` · `moments-page` · `contacts-page` · `discover-page` · `profile-page`

## 数据库实体（21个）
**核心**: User · Character · Conversation · Message · SystemConfig

**朋友圈**: MomentPost · MomentComment · MomentLike · MomentEntity(legacy)

**社交**: Friendship · FriendRequest · AIRelationship

**群聊**: Group · GroupMember · GroupMessage

**视频号**: FeedPost · FeedComment · UserFeedInteraction

**世界**: WorldContext · NarrativeArc · AIBehaviorLog

## 环境变量（api/.env）
`DEEPSEEK_API_KEY` · `OPENAI_BASE_URL` · `JWT_SECRET` · `ADMIN_SECRET` · `DATABASE_PATH`

## 共享包（packages/）
`@yinjie/ui` · `@yinjie/contracts` · `@yinjie/config` · `@yinjie/tooling`

## 部署
- 云端：`docker compose up`（api/ + SQLite 数据卷）
- 客户端首次启动 → Setup 页填入服务器地址（官方或自建）
- 管理后台：访问 apps/admin，输入 `ADMIN_SECRET` 鉴权
