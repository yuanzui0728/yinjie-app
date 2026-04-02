# Phase 0 - Parity Matrix

> 目标：冻结旧系统行为，作为 Rust 迁移验收基线。  
> 原则：只迁结构，不改规则。

## 主流程矩阵

| 能力 | 旧实现来源 | 新运行时要求 | 当前状态 |
| --- | --- | --- | --- |
| Onboarding 初始化用户 | `web/src/pages/Onboarding.tsx` + `api/src/modules/auth` | 保持只输入名字即可进入 | 已登记 |
| 登录 / 注册 / 完成 onboarding | `auth.controller.ts` / `auth.service.ts` | 路由与响应字段兼容 | 已登记 |
| 角色列表 / 详情 / 创建 / 编辑 | `characters` 模块 + `web/src/pages/CharacterDetail.tsx` | 角色业务语义不变 | 已登记 |
| 单聊消息 + typing | `chat.gateway.ts` + `chat.service.ts` | `/chat` namespace 与事件名不变 | 已登记 |
| 忙碌 / 睡眠提示 | `chat.gateway.ts` | 继续用系统状态拦截 | 已登记 |
| 协作式升级群聊 | `chat.service.ts` | 自动升级逻辑不变 | 已登记 |
| 群聊创建 / 发送 | `GroupService` + `GroupChat.tsx` | 先迁服务，再补前端闭环 | 已登记 |
| 好友申请 / 接受 / 拒绝 | `social.service.ts` | 状态流转不变 | 已登记 |
| 摇一摇 | `Discover.tsx` + `social.service.ts` | 随机匹配逻辑不变 | 已登记 |
| 朋友圈发帖 / 点赞 / 评论 | `moments.service.ts` | 互动调度逻辑不变 | 已登记 |
| 发现页发帖 / 点赞 / 评论 | `feed.service.ts` | AI 反应逻辑不变 | 已登记 |
| 定时世界快照 / 角色状态 | `scheduler.service.ts` | cron 频率与触发规则不变 | 已登记 |
| 后台角色管理 / 模型配置 | `admin/src/pages/*` | 功能保留，UI 重写 | 已登记 |

## 不改变的业务边界

- 不改现有角色规则、关系规则、触发条件、主动消息触发时机。
- 不改朋友圈、发现页、群聊、单聊的业务语义。
- 不改数据库实体的业务含义，只改持久化实现与迁移方式。
- 不改 `/api/*` 与 `/chat` 的业务兼容面。
