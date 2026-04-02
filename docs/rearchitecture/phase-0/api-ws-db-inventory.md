# Phase 0 - API / WS / DB Inventory

## 业务 HTTP 接口兼容面

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/init`
- `PATCH /api/auth/users/:id/onboarding-complete`
- `PATCH /api/auth/users/:id`

### Characters

- `GET /api/characters`
- `GET /api/characters/:id`
- `POST /api/characters`
- `PATCH /api/characters/:id`
- `DELETE /api/characters/:id`

### Conversations / Groups

- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/:id/messages`
- `POST /api/conversations/:id/read`
- `POST /api/groups`
- `GET /api/groups/:id`
- `GET /api/groups/:id/members`
- `POST /api/groups/:id/members`
- `POST /api/groups/:id/messages`

### Content / Social / Config / World

- `GET /api/moments`
- `POST /api/moments/user-post`
- `GET /api/moments/:id`
- `POST /api/moments/generate/:characterId`
- `POST /api/moments/generate-all`
- `POST /api/moments/:id/comment`
- `POST /api/moments/:id/like`
- `GET /api/feed`
- `GET /api/feed/:id`
- `POST /api/feed`
- `POST /api/feed/:id/comment`
- `POST /api/feed/:id/like`
- `GET /api/social/friend-requests`
- `POST /api/social/friend-requests/:id/accept`
- `POST /api/social/friend-requests/:id/decline`
- `GET /api/social/friends`
- `POST /api/social/shake`
- `POST /api/social/friend-requests/send`
- `POST /api/social/trigger-scene`
- `GET /api/config/ai-model`
- `PUT /api/config/ai-model`
- `GET /api/config/available-models`
- `GET /api/world/context`

## WebSocket 兼容面

- namespace: `/chat`
- 事件：
  - `join_conversation`
  - `send_message`
  - `new_message`
  - `typing_start`
  - `typing_stop`
  - `conversation_updated`

## 当前数据库实体基线

- 核心：`users`、`characters`、`conversations`、`messages`、`system_config`
- 朋友圈：`moment_posts`、`moment_comments`、`moment_likes`、`moments`(legacy)
- 社交：`friend_requests`、`friendships`、`ai_relationships`
- 群聊：`groups`、`group_members`、`group_messages`
- 发现页：`feed_posts`、`feed_comments`、`user_feed_interactions`
- 世界 / 叙事：`world_contexts`、`narrative_arcs`、`ai_behavior_logs`

## 新增系统接口

- `GET /system/status`
- `POST /system/provider/test`
- `GET /system/logs`
- `POST /system/diag/export`
- `POST /system/backup/create`
- `POST /system/backup/restore`
