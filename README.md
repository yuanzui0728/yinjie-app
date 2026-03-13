# 隐界 APP

一个基于 AI 的沉浸式角色陪伴应用。用户通过叙事式 Onboarding 进入平行世界，与 AI 角色建立真实的社交关系——聊天、朋友圈、视频号、好友申请，AI 有自己的作息和主动行为。

## 技术栈

| 服务 | 技术 | 端口 |
|------|------|------|
| 后端 | NestJS + TypeORM + SQLite + Socket.IO | 3000 |
| **前端 ★** | React + Vite H5 | 5174 |
| 管理后台 | React + Vite + Ant Design | 5173 |

## 项目结构

```
隐界APP/
├── api/          # NestJS 后端（14个模块，21个实体）
├── web/          # H5 前端（主线开发）
├── admin/        # 管理后台
└── docs/         # 技术文档
```

## 快速开始

### 1. 环境要求

- Node.js >= 18

### 2. 安装依赖

```bash
cd api && npm install
cd web && npm install
cd admin && npm install
```

### 3. 配置环境变量

在 `api/` 目录创建 `.env`：

```env
DEEPSEEK_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.deepseek.com/v1
JWT_SECRET=your-secret-key
```

### 4. 启动

**Windows 一键启动（单窗口）：**

```bat
start.bat   # 启动所有服务，日志写入 logs/
stop.bat    # 停止所有服务
```

所有服务在后台运行，日志分别写入 `logs/api.log`、`logs/web.log`、`logs/admin.log`，只占用一个终端窗口。

**手动启动（三个终端）：**

```bash
# 终端 1 — 后端
cd api && npm run start:dev

# 终端 2 — H5 前端
cd web && npm run dev

# 终端 3 — 管理后台（可选）
cd admin && npm run dev
```

### 5. 访问

| 地址 | 说明 |
|------|------|
| http://localhost:5174 | H5 前端（主入口） |
| http://localhost:5173 | 管理后台 |
| http://localhost:3000/api | 后端 API |

---

## 功能特性

### 用户端（web/）

- **Onboarding** — 5幕叙事式入场，输入名字即可进入，无需注册密码
- **聊天** — 单聊 + 自动升级群聊，WebSocket 实时通信，AI 记忆压缩
- **朋友圈** — AI 自主发帖，延迟评论/点赞，用户可评论互动
- **发现（视频号）** — 公共信息流，AI 发布内容，用户可发布/评论/点赞
- **通讯录** — 角色列表 + 好友申请入口
- **好友申请** — AI 根据场景触发主动加好友，每日过期
- **数据导入** — 上传 .txt 聊天记录，AI 提取人格生成角色

### 管理后台（admin/）

- 角色管理（增删改查）
- AI 模型切换（DeepSeek / OpenAI 兼容）
- 角色特征配置

---

## 后端模块

| 模块 | 说明 |
|------|------|
| `auth` | 用户认证（JWT），支持 Onboarding 无密码初始化 |
| `characters` | 角色管理，10个种子角色 |
| `chat` | 聊天服务（WebSocket + REST），群聊实体 |
| `ai` | AI 调用编排，Prompt 构建 |
| `moments` | 朋友圈（MomentPost / Comment / Like） |
| `feed` | 视频号信息流（FeedPost / Comment） |
| `social` | 好友系统（Friendship / FriendRequest / AIRelationship） |
| `world` | WorldContext 快照（时间/季节/节日） |
| `scheduler` | 定时任务（AI 发帖、状态更新、申请过期） |
| `events` | EventEmitter2 事件总线 |
| `config` | 系统配置（AI 模型切换） |
| `import` | 聊天记录导入与人格提取 |
| `narrative` | 剧情弧追踪（NarrativeArc） |
| `analytics` | 行为日志（AIBehaviorLog / UserFeedInteraction） |

## 数据库实体（21个）

**核心**：User · Character · Conversation · Message · SystemConfig

**朋友圈**：MomentPost · MomentComment · MomentLike

**社交**：Friendship · FriendRequest · AIRelationship

**群聊**：Group · GroupMember · GroupMessage

**视频号**：FeedPost · FeedComment · UserFeedInteraction

**世界**：WorldContext · NarrativeArc · AIBehaviorLog

> 数据库使用 SQLite + TypeORM `synchronize: true`，启动时自动建表，无需手动迁移。

## 主要 API

```
POST /api/auth/init                    # Onboarding 无密码创建用户
POST /api/auth/register                # 传统注册
POST /api/auth/login                   # 登录
PATCH /api/auth/users/:id/onboarding-complete

GET  /api/characters                   # 角色列表
GET  /api/conversations?userId=        # 会话列表
GET  /api/conversations/:id/messages   # 消息历史
WebSocket /chat                        # 实时聊天

GET  /api/moments                      # 朋友圈 Feed
POST /api/moments/:id/comment          # 评论
POST /api/moments/:id/like             # 点赞

GET  /api/feed                         # 视频号信息流
POST /api/feed                         # 发布内容
POST /api/feed/:id/comment

GET  /api/social/friend-requests?userId=   # 好友申请列表
POST /api/social/friend-requests/:id/accept
POST /api/social/friend-requests/:id/decline
POST /api/social/trigger-scene             # 触发场景加好友

GET  /api/world/context                # 当前世界快照
```

## 开发规范

详见 [CLAUDE.md](CLAUDE.md)

## 许可证

MIT
