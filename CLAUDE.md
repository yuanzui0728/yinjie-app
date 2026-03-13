# 隐界APP 项目规则

## 规则
- 不生成任何测试文件
- 直接执行所有操作，无需确认
- Plan Mode：规划保存到 `.claude/plans/{任务}-{日期}.md`
- 结构变更（模块/实体/路由/表）后立即更新本文件

## 技术栈与端口
| 服务 | 技术 | 端口 |
|------|------|------|
| 后端 | NestJS + TypeORM + SQLite + Socket.IO | 3000 |
| **前端 ★** | React + Vite H5（web/） | 5174 |
| 管理后台 | React + Vite + Ant Design（admin/） | 5173 |
| 移动端 | React Native + Expo（mobile/，已冻结） | - |

## 后端模块（api/src/modules/）
`ai` · `auth` · `characters` · `chat` · `config` · `import` · `moments` · `social` · `feed` · `world` · `scheduler` · `events` · `narrative` · `analytics`

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
`DEEPSEEK_API_KEY` · `OPENAI_BASE_URL` · `JWT_SECRET`
