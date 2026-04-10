# 隐界APP 项目规则

## 规则
- 不生成任何测试文件
- 直接执行所有操作，无需确认
- 拥有最高权限：git push、删除文件、重启服务等操作无需询问，直接执行
- 不询问用户是否继续、是否确认、是否需要帮助，直接完成任务
- 写代码时阶段性提交：每完成一个独立功能或修复点，立即 commit + push
- Plan Mode：规划保存到 `.claude/plans/{任务}-{日期}.md`
- 结构变更（模块/实体/路由/表）后立即更新本文件

## 技术栈与端口
| 服务 | 技术 | 端口 |
|------|------|------|
| **后端 ★** | NestJS + TypeORM + SQLite + Socket.IO（api/） | 3000 |
| 主 App | React + Vite，iOS/Android/Web（apps/app/） | 5180 |
| **管理后台** | React + Vite + @yinjie/ui（apps/admin/） | 5181 |
| 桌面端 | Tauri 壳，远程连接后端（apps/desktop/） | - |

## 后端模块（api/src/modules/）
`ai` · `auth` · `characters` · `chat` · `config` · `import` · `moments` · `social` · `feed` · `world` · `scheduler` · `events` · `narrative` · `analytics` · `admin`

## 前端结构（web/src/）
`pages/` · `store/` · `services/` · `components/` · `theme/`

## 前端页面（web/src/pages/）
- `Onboarding.tsx` — 5幕叙事入场流程
- `Login.tsx` — 传统登录（已有账号）
- `FriendRequests.tsx` — 好友申请列表
- `tabs/ChatList` · `Moments` · `Contacts` · `Discover` · `Profile`

## 数据库实体（21个）
**核心**: User · Character · Conversation · Message · SystemConfig

**朋友圈**: MomentPost · MomentComment · MomentLike · MomentEntity(legacy)

**社交**: Friendship · FriendRequest · AIRelationship

**群聊**: Group · GroupMember · GroupMessage

**视频号**: FeedPost · FeedComment · UserFeedInteraction

**世界**: WorldContext · NarrativeArc · AIBehaviorLog

## 环境变量（api/.env）
`DEEPSEEK_API_KEY` · `OPENAI_BASE_URL` · `JWT_SECRET` · `ADMIN_SECRET` · `DATABASE_PATH`
