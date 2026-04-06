# 隐界APP 项目规则

## 规则

- 不生成任何测试文件
- 直接执行所有操作，无需确认
- 执行过程中默认连续推进，无需频繁询问；仅在存在高风险冲突或关键信息缺失时才中断提问
- Plan Mode：规划保存到 `.Codex/plans/{任务}-{日期}.md`
- 结构变更（模块/实体/路由/表）后立即更新本文件

## 当前架构状态

项目正在从原始 Demo 结构迁移到生产级单用户自部署架构。

### 新结构（生产级重构进行中）

- `apps/app/`：新主产品前端，桌面内嵌 WebView 使用，已接入 `Splash`、`Setup`、`Onboarding`、`Login`、`ChatList`、`ChatRoom`、`GroupChat`、`CreateGroup`、`Moments`、`Discover`、`Contacts`、`Profile`、`CharacterDetail`、`FriendRequests`；当前已抽出平台能力与运行时配置层，桌面壳首启会进入本地 `Setup` 检查 Core API / runtime data / provider，远程模式则会在 `Setup` 中配置并测试远端 Core API 地址
- `apps/app/`：新主产品前端，桌面内嵌 WebView 使用，已接入 `Splash`、`Setup`、`Onboarding`、`Login`、`ChatList`、`ChatRoom`、`GroupChat`、`CreateGroup`、`Moments`、`Discover`、`Contacts`、`Profile`、`CharacterDetail`、`FriendRequests`；当前已抽出平台能力与运行时配置层，桌面壳首启会进入本地 `Setup` 检查 Core API / runtime data / provider，远程模式则会在 `Setup` 中配置并测试远端 Core API 地址；未登录流的 `Onboarding / Login / Setup` 当前都可直接访问隐私政策、用户协议与社区规范
- `apps/android-shell/`：Android 原生壳容器目录，采用 Capacitor 方案承载 `apps/app` 的构建产物；当前已建立 `android-shell.config.json` 配置源与 `android:configure / init / sync / open / apk / bundle / doctor` 脚本，并已生成 `apps/android-shell/android/` 原生 Android 工程；Android 壳当前已加入 `YinjieRuntimePlugin`，可把 manifest 中的 `api_base_url / socket_base_url / environment` 与版本元数据注入给 `apps/app` 运行时，且会同步生成 `apps/app/public/runtime-config.json` 作为 Web 默认配置；release 默认关闭 cleartext traffic、关闭应用备份与 device transfer 数据导出，并支持通过 `android-signing.local.properties` 注入签名信息
- `apps/admin/`：新本地后台前端，由本地服务托管或浏览器访问，已接入 Dashboard、Characters 列表、Character 编辑页、Evals 页面、`/setup` 统一运行时配置页，以及桌面运行时 Core API 启停/探活控制；在桌面壳内若 Core API 未就绪，会先显示全局启动引导层
- `apps/admin` 当前已把 runtime/provider 的写操作从 Dashboard 收敛到 `/setup`：Dashboard 以状态概览、评测入口和跳转为主，避免与 `/setup` 重复维护同一套控制逻辑
- `apps/desktop/`：Tauri 2 桌面壳，已接入 runtime 路径解析、Core API 生命周期命令、桌面侧 health probe、桌面运行时诊断，并在桌面启动时自动探测/拉起 Core API；当前支持 start / stop / restart / probe 命令
- `apps/ios-shell/`：iOS 原生壳骨架，当前采用 Capacitor 方向，已补 `package.json`、`capacitor.config.ts` 与基础 sync/open 脚本，后续承接 Xcode 工程、签名、Keychain、Push 与 Privacy 文案
- `apps/ios-shell/plugins/`：iOS native plugin 规范与 Swift stub 目录，当前已补 `YinjieRuntime` / `YinjieSecureStorage` 的桥接说明与占位实现，供后续接入真实 Xcode plugin
- `apps/ios-shell/xcode-template/`：Xcode 工程占位模板，当前已补 `Info.plist`、`PrivacyInfo.xcprivacy`、`App.entitlements`、`Podfile` 和 Capabilities 样例
- `apps/ios-shell/scripts/doctor-ios.mjs` / `configure-ios-project.mjs`：iOS 壳自动化辅助脚本，当前用于在 macOS 上检查前置条件，并在 `pnpm ios:sync` 之后把模板与 plugin stub 复制进生成的 iOS 工程
- `docs/ios-build.md`：iOS 构建与 Xcode 接入说明，承接 `apps/app` + `apps/ios-shell` 的同步、签名与提审前置步骤
- `docs/ios-app-store-submission.md`：iOS 提审资料清单，承接 App Store Connect 元数据、审核说明、隐私营养标签与权限用途文案
- `docs/ios-review-notes-template.md` / `docs/ios-test-account-template.md` / `docs/ios-app-store-metadata-draft.md`：iOS 审核备注、测试账号模板与商店元数据草案
- `docs/ios-device-regression-checklist.md` / `docs/ios-xcode-integration-checklist.md`：iOS 真机回归与 Xcode 接入执行清单
- `docs/ios-plugin-implementation-guide.md` / `docs/ios-preflight-p0-p1.md`：iOS native plugin 真实接线步骤与提审前 P0/P1 收口清单
- `docs/ios-macos-runbook.md`：macOS/Xcode 环境的一页式执行单，串起 `ios:doctor` / `ios:sync` / `ios:configure` / `ios:open`、plugin 接线、真机回归与提审填写
- `crates/core-api/`：Rust Core API
- `crates/core-api/src/evals/`：评测体系骨架，承接 datasets / runs / comparisons / traces 的系统路由与本地存储
- `crates/core-api/src/persistence.rs`：运行态 snapshot 持久化与备份恢复
- `crates/core-api/src/runtime_paths.rs`：runtime/logs/diagnostics 路径与本地操作日志
- `crates/core-api/src/generation.rs`：gateway 优先、占位文案回退的内容生成辅助层
- `crates/core-api/src/auth_support.rs`：Bearer session 解析与关键用户接口 user scope 校验
- `crates/core-api` 当前会把本地 auth sessions 持久化到 runtime snapshot；Bearer token 需命中真实 session 记录，不再仅按 `userId` 字符串伪造通过
- `crates/inference-gateway/`：Rust 推理网关，已具备 provider 配置 / 探活 / 队列指标运行时
- `packages/contracts/`：共享接口契约与 typed client
- `datasets/`：评测样本、回放场景、persona 资产的仓库级数据目录
- `datasets/evals/rubrics/`：judge rubric 资产目录，供评测 run 动态读取
- `datasets/evals/strategies/`：memory policy strategy 资产目录，供评测 run 动态读取
- `datasets/evals/prompt-variants/`：prompt variant 资产目录，供评测 run 动态读取
- `datasets/evals/experiments/`：experiment preset 资产目录，供评测 run 版本化与一键复跑
- `packages/config/`：共享配置 schema
- `packages/config/`：共享配置 schema；当前已开始承接 setup 逻辑 helper，包括 provider 默认草稿、normalize、payload trim 与校验
- `packages/ui/`：共享设计系统与基础组件
- `packages/ui/`：共享设计系统与基础组件；当前已开始承接 setup 展示层的共享组件（步骤状态列表、状态卡），供 `apps/app` 与 `apps/admin` 共用
- `packages/ui/`：共享设计系统与基础组件；当前已开始承接 setup 展示层与部分业务编排，共享了步骤状态列表、状态卡，以及 provider setup 的 `useProviderSetup` hook，供 `apps/app` 与 `apps/admin` 共用
- `packages/ui/`：共享设计系统与基础组件；当前已开始承接 setup 展示层与部分业务编排，共享了步骤状态列表、状态卡、provider setup 的 `useProviderSetup` hook，以及桌面 runtime 的共享 client / `useDesktopRuntime` hook，供 `apps/app` 与 `apps/admin` 共用
- `packages/ui/`：共享设计系统与基础组件；当前已开始承接 setup 展示层与部分业务编排，共享了步骤状态列表、状态卡、桌面 runtime actions、provider setup form、provider setup 的 `useProviderSetup` hook，以及桌面 runtime 的共享 client / `useDesktopRuntime` hook，供 `apps/app` 与 `apps/admin` 共用
- `packages/ui/`：共享设计系统与基础组件；当前已开始承接 setup 展示层与部分业务编排，共享了 `SetupScaffold` 页面壳、步骤状态列表、状态卡、桌面 runtime actions、provider setup form、provider setup 的 `useProviderSetup` hook，以及桌面 runtime 的共享 client / `useDesktopRuntime` hook，供 `apps/app` 与 `apps/admin` 共用
- `packages/tooling/`：共享工程配置

### 旧结构（保留作为行为基线）

- `api/`：旧 NestJS 后端，当前仍是业务行为对照基线
- `web/`：旧 H5 主前端
- `admin/`：旧管理后台
- `mobile/`：冻结，不继续演进

## 技术栈与端口

| 服务 | 技术 | 端口 / 运行方式 |
|------|------|------|
| Android 壳 | Capacitor 7 + Android WebView | Android 应用 |
| 桌面壳 | Tauri 2 + Rust | 桌面应用 |
| Core API | Rust + Axum + Tokio + SQLite(WAL 规划) | 默认 `39091` |
| 推理网关 | Rust（独立 crate） | 内嵌 / 同进程规划 |
| 主产品前端 | React 19 + Vite + TanStack Router + Query + Tailwind 4 | `5180` |
| 本地后台 | React 19 + Vite + typed schema 表单 | `5181` |
| 旧后端 | NestJS + TypeORM + SQLite + Socket.IO | `3000` |
| 旧前端 | React + Vite H5（`web/`） | `5174` |
| 旧后台 | React + Vite + Ant Design（`admin/`） | `5173` |

## 新 Core API 路由状态

### 系统接口

- `GET /health`
- `GET /system/status`
- `GET /system/evals/overview`
- `GET /system/evals/datasets`
- `GET /system/evals/datasets/:id`
- `GET /system/evals/strategies`
- `GET /system/evals/prompt-variants`
- `GET /system/evals/experiments`
- `POST /system/evals/experiments/:id/run`
- `GET /system/evals/reports`
- `POST /system/evals/reports/:id/decision`
- `GET /system/evals/runs`
- `POST /system/evals/runs`
- `GET /system/evals/runs/:id`
- `GET /system/evals/comparisons`
- `POST /system/evals/compare`
- `POST /system/evals/compare/run`
- `GET /system/evals/traces`
- `GET /system/evals/traces/:id`
- `GET /system/realtime`
- `GET /system/provider`
- `PUT /system/provider`
- `POST /system/provider/test`
- `POST /system/inference/preview`
- `GET /system/scheduler`
- `POST /system/scheduler/run/:id`
- `GET /system/logs`
- `POST /system/diag/export`
- `POST /system/backup/create`
- `POST /system/backup/restore`

### 实时接口

- Socket.IO namespace `/chat`
- Socket path `/socket.io`

### 已迁移的兼容接口切片

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/init`
- `GET /api/auth/sessions`
- `POST /api/auth/sessions/:sessionId/revoke`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `PATCH /api/auth/users/:id/onboarding-complete`
- `PATCH /api/auth/users/:id`
- `DELETE /api/auth/users/:id`
- `GET /api/moderation/reports`
- `POST /api/moderation/reports`
- `GET /api/config/ai-model`
- `PUT /api/config/ai-model`
- `GET /api/config/available-models`
- `GET /api/world/context`
- `GET /api/social/friend-requests`
- `POST /api/social/friend-requests/send`
- `POST /api/social/friend-requests/:id/accept`
- `POST /api/social/friend-requests/:id/decline`
- `GET /api/social/friends`
- `GET /api/social/blocks`
- `POST /api/social/block`
- `POST /api/social/unblock`
- `POST /api/social/shake`
- `POST /api/social/trigger-scene`
- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/:id/messages`
- `POST /api/conversations/:id/read`
- `POST /api/groups`
- `GET /api/groups/:id`
- `GET /api/groups/:id/members`
- `POST /api/groups/:id/members`
- `GET /api/groups/:id/messages`
- `POST /api/groups/:id/messages`
- `GET /api/characters`
- `GET /api/characters/:id`
- `POST /api/characters`
- `PATCH /api/characters/:id`
- `DELETE /api/characters/:id`
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

## 共享契约状态（packages/contracts）

已建立 typed contracts：

- `system`
- `evals`
- `world`
- `social`
- `chat`
- `moments`
- `feed`
- `auth`
- `config`
- `characters`
- `ws`

当前 `/chat` 已有真实运行时：

- `join_conversation`
- `send_message`
- `new_message`
- `typing_start`
- `typing_stop`
- `conversation_updated`

当前 scheduler 主动消息已接入 `/chat`：

- scheduler 会把 proactive message 通过内部 realtime bus 推送为 `new_message`
- `/system/realtime` 会记录对应 internal realtime event

当前 Core API 已有本地运行态持久化：

- runtime 与 scheduler 状态会落盘到 `*.runtime.json`
- 进程重启会优先从 snapshot 恢复
- `/system/backup/create` 与 `/system/backup/restore` 已接到真实 snapshot 备份恢复

当前系统运维导出已真实落地：

- `/system/logs` 返回真实 runtime log 路径
- `/system/diag/export` 会导出 diagnostics 目录，包含 status / realtime / scheduler / snapshot / logs / recent backups
- `runtime-data/logs/core-api.log` 已有本地操作日志兜底

当前 inference gateway 已有真实 provider runtime：

- `/system/provider` 可读取与保存当前 provider 配置
- `/system/provider/test` 会通过真实 HTTP 探活更新队列指标
- `/system/inference/preview` 可通过 active provider 发送真实 `chat/completions` 预览请求
- `/system/status` 会返回 active provider、队列并发、成功/失败次数、最近成功时间与最近错误
- `/api/config/ai-model` 与 provider.model 已保持联动并随 snapshot 持久化恢复

当前评测体系已进入真实 trace 阶段：

- `/system/evals/*` 已提供 overview / datasets / runs / comparisons / traces 控制面骨架
- `runtime-data/evals/runs/*.json` 会持久化评测 run 结果
- `runtime-data/evals/comparisons/*.json` 会持久化 pairwise comparison 结果
- `runtime-data/evals/reports/*.json` 会持久化 experiment report 结果
- `runtime-data/evals/traces/*.json` 已开始承接核心生成链 trace
- `POST /system/evals/runs` 已可真实执行当前首批 dataset：
  - `chat-foundation`
  - `social-boundary`
  - `group-intent`
  - `memory-summary`
  - `group-coordinator`
- `/system/evals/compare` 已可对最近评测 run 做基础 win / lose / tie 对比
- `/system/evals/compare` 当前已返回 case 级状态、输出、分数总和、failure tags、rule violations 与 trace 链接差异
- `/system/evals/compare/run` 已可对同一 dataset 一键执行 baseline / candidate pairwise 评测
- `GET /system/evals/runs` 与 `GET /system/evals/comparisons` 当前支持按 `datasetId / experimentLabel / providerModel / judgeModel / promptVariant / memoryPolicyVariant` 做实验历史筛选
- 评测 run 当前已采用“规则校验 + 可选 LLM judge”组合：
  - provider 可用时会按 `judgeRubrics` 生成附加 judge scores 与 judge rationale
  - provider 缺失或 judge 失败时会自动回退为规则评测，不阻断 run
- judge rubrics 已从代码内置映射迁到 `datasets/evals/rubrics/*.json` 动态读取
- memory policy strategies 已从代码分支迁到 `datasets/evals/strategies/*.json` 动态读取
- prompt variants 已从代码分支迁到 `datasets/evals/prompt-variants/*.json` 动态读取
- experiment presets 已支持从 `datasets/evals/experiments/*.json` 动态读取并一键执行
- experiment run 完成后会生成独立 report，汇总 runs / comparison / case delta / failure tag delta
- experiment report 当前还会生成 `recommendations / regressions / keep / rollback` 结论字段，供调优动作直接参考
- experiment report 当前支持决策链状态更新：`keep-testing / promote / rollback / archive`，并记录 applied action / decidedAt / decidedBy
- pairwise 执行当前支持：
  - experiment label
  - candidate model override
  - candidate judge model override
  - candidate prompt variant（`warmer` / `concise` / `sharper`）
- candidate memory policy variant（`recent-only` / `compressed` / `none`）
- 单次 dataset run 当前也可带 `provider override / judge model override / prompt variant / memory policy variant`
- eval run 当前会记录 `experiment label / effective provider model / effective judge model / prompt variant / memory policy variant`
- 当前已接 trace 的生成链包括：
  - `generate_chat_reply_text`
  - `generate_social_greeting_text`
  - `classify_group_chat_intent`
  - `generate_group_coordinator_text`
  - `generate_memory_summary_text`

当前内容生成链已开始接入 inference gateway：

- `POST /api/moments/generate/:characterId`
- `POST /api/moments/generate-all`
- scheduler `check-moment-schedule`
- scheduler `process-pending-feed-reactions`
- scheduler `trigger-memory-proactive-messages`

以上链路会在 provider 可用时走 gateway 生成，在 provider 缺失或失败时回退到当前占位文案，保证业务语义和触发条件不变

当前 scheduler 已有真实执行切片：

- world context 更新
- friend request 过期
- AI 在线状态刷新
- character activity 刷新
- moments 调度
- scene friend request 触发
- feed 待处理互动
- memory proactive messages

## 业务兼容要求（迁移期间保持）

以下接口语义必须保持不变：

- `/api/auth/*`
- `/api/characters/*`
- `/api/conversations/*`
- `/api/groups/*`
- `/api/moments/*`
- `/api/feed/*`
- `/api/social/*`
- `/api/config/*`
- `/api/world/*`
- WebSocket namespace `/chat`

## 旧后端模块（业务基线）

`ai` · `auth` · `characters` · `chat` · `config` · `import` · `moments` · `social` · `feed` · `world` · `scheduler` · `events` · `narrative` · `analytics`

## 旧前端页面（业务基线）

- `Onboarding.tsx`：5 幕叙事入场流程
- `Login.tsx`：传统登录
- `FriendRequests.tsx`：好友申请列表
- `tabs/ChatList`
- `tabs/Moments`
- `tabs/Contacts`
- `tabs/Discover`
- `tabs/Profile`

## 新主产品前端页面（apps/app）

- `/`：`SplashPage`
- `/setup`：当前已开始按渠道分流：桌面壳内仍作为首启向导检查 Core API / Provider / Runtime Data，并提供桌面运行时手动恢复入口；远程渠道会展示服务连接状态与继续进入入口
- `/onboarding`：叙事式入场与 `auth/init`
- `apps/app` 当前已开始抽离平台能力：会持久化环境准备态与 provider ready 状态；`SplashPage` 在桌面壳内首次仍会进入 `/setup`，远程渠道则直接走 `Onboarding` / `Login`
- `/login`：兼容登录入口
- `/tabs/chat`：会话列表
- `/tabs/moments`：朋友圈
- `/tabs/discover`：发现页 / 摇一摇 / Feed 发帖
- `/tabs/contacts`：通讯录
- `/tabs/profile`：用户资料，已接入桌面运行时状态与 Core API 启停/探活控制
- `SplashPage` 在桌面壳内若尚未建立 session，会优先跳转到 `/setup`，而不是直接进入 `/onboarding`
- `apps/app` 根布局在桌面壳内会全局感知 Core API 可达性；若本地运行时尚未就绪，会显示启动引导层并尝试自动拉起 Core API
- `apps/app` 当前已补 iOS Safe Area 基础适配：根容器会读取 `safe-area-inset-*`，顶部壳与底部 tabs 会为刘海和 Home Indicator 预留空间
- `apps/app` 当前聊天输入区已开始做移动端键盘适配：`ChatComposer` 会基于 `visualViewport` 计算底部 inset，聊天页与群聊页会在消息变动时自动滚动到底部
- `apps/app` 当前 session 持久化已切到“原生安全存储优先、Web Storage 回退”的抽象；待 `YinjieSecureStorage` native plugin 接上后，iOS/Android 登录态可无业务层改动地迁入安全存储
- `/chat/:conversationId`：实时聊天页，已接入 `/chat` Socket.IO
- `/group/:groupId`：群聊页
- `/group/new`：建群页
- `/character/:characterId`：角色详情
- `/friend-requests`：好友申请处理
- `/legal/privacy`：隐私政策静态页
- `/legal/terms`：用户协议静态页
- `/legal/community`：社区与安全说明页

## 数据库实体基线（21 个）

核心：
`User` · `Character` · `Conversation` · `Message` · `SystemConfig`

朋友圈：
`MomentPost` · `MomentComment` · `MomentLike` · `MomentEntity(legacy)`

社交：
`Friendship` · `FriendRequest` · `AIRelationship`

群聊：
`Group` · `GroupMember` · `GroupMessage`

发现页：
`FeedPost` · `FeedComment` · `UserFeedInteraction`

世界：
`WorldContext` · `NarrativeArc` · `AIBehaviorLog`

## 环境与配置

### 旧后端环境变量（仍在使用）

- `DEEPSEEK_API_KEY`
- `OPENAI_BASE_URL`
- `JWT_SECRET`

### 新架构配置方向

- API Key 目标迁移到系统 keychain / keyring
- 运行配置进入本地 app data 目录
- SQLite 文件迁移到桌面运行时数据目录
## Current Migration Notes

- Realtime `/chat` replies now have a gateway-backed execution path in `crates/core-api/src/realtime.rs`.
- Chat reply prompt assembly lives in `crates/core-api/src/generation.rs` and uses recent message history, character memory, current activity, and optional world context.
- The realtime execution path now snapshots runtime state before inference so gateway waits do not hold the runtime write lock.
- Fallback placeholder replies are still preserved when the provider is unavailable or the gateway call fails.
- Social first-contact greetings in `/api/social/shake` and `/api/social/trigger-scene` now also use the gateway-backed generation layer with fallback copy preserved.
- Scheduler `trigger-scene-friend-requests` now reuses the same gateway-backed social greeting generation path before persisting pending friend requests.
- Realtime conversation turns now refresh character memory summaries every 10 messages through the gateway and persist both `profile.memorySummary` and `profile.memory.recentSummary`.
- Direct `/chat` conversations can now classify cross-domain intent and upgrade themselves into temporary group consultations with coordinator copy, system join messages, and invited character replies generated through the gateway-backed runtime.
- `POST /api/groups/:id/messages` now restores async group-member reply parity: user turns can trigger delayed character replies through the gateway-backed chat generation path, with activity-frequency gating and persisted group message history.
- Runtime state now carries `ai_behavior_logs` and `narrative_arcs` compatibility records, and `/system/status.legacySurface` exposes their live counts for migration tracking.
- Accepted friend requests now ensure a narrative arc, while scene-triggered requests, generated moments, scheduler feed reactions, and async group replies append AI behavior logs without changing business responses.
- `apps/app` is no longer only a migration dashboard. It now carries the main mobile-style product shell and consumes the migrated `auth` / `social` / `chat` / `moments` / `feed` / `characters` contracts directly against `crates/core-api`.
- `apps/app` chat rooms now connect to Socket.IO namespace `/chat`, join conversation rooms, send realtime messages, receive `new_message`, show typing state, and consume `conversation_updated` for direct-to-group upgrade closure.
- `packages/contracts` now supports a shared auth token provider so browser clients can attach `Authorization: Bearer <token>` automatically.
- `packages/contracts` now also supports a shared Core API base URL provider so app channels can stop hardcoding `localhost:39091`.
- Key user-scoped Core API routes in `auth` / `chat` / `social` / `moments` / `feed` now validate persisted bearer sessions and require the authenticated user to match the requested `userId` or actor id.
- Auth session management now supports listing, current logout, logout-all, and single historical-session revoke from the `apps/app` profile page.
- Auth user management now also supports self-service account deletion through `DELETE /api/auth/users/:id`; deleting an account revokes all sessions and clears user-scoped social/content runtime records.
- `apps/app` now exposes a minimum iOS/App Store safety surface: character detail and direct chat can create moderation reports, profile can review recent reports and manage blocked characters, and legal pages are available in-app.
- Core API social routes now support blocked characters, and moderation routes now persist user-submitted safety reports in runtime state for later review.
- Blocked characters now also affect app distribution paths: hidden characters are excluded from discovery/social feed rendering, contact world lists, direct conversation quick-start, and direct conversation creation/listing on the Core API side.
- Native runtime config loading now supports iOS/mobile fallback: `apps/app` 会优先尝试读取原生 plugin 配置，失败时再读取 `/runtime-config.json`，供 `apps/ios-shell` 后续注入远程 Core API 地址。
- `apps/ios-shell/ios-permissions.example.json` 已开始维护 iOS 权限用途文案占位，供后续生成 `Info.plist` 与提审材料时复用。
- iOS 提审所需的审核备注、测试账号模板和 metadata 草案现已入库，后续可直接基于仓库文档填写 App Store Connect，而无需再从头整理。
- iOS Xcode 接入与真机回归所需的模板和执行清单也已入库，后续在 macOS 上主要是将这些样例映射到真实工程并逐项打勾验证。
- iOS 剩余工作当前已被明确拆成：
  - 仓库内已完成的前端/壳/文档准备
  - 必须在 macOS/Xcode/真机环境完成的 P0 事项（签名、plugin、真机回归、App Store Connect 填写）
