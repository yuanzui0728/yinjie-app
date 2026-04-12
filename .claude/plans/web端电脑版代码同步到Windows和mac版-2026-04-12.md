# Web端电脑版代码同步到 Windows 和 mac 版执行规划

日期：2026-04-12
仓库：`/home/ps/claude/yinjie-app`
目标：把近期 Web 端电脑版的功能/UI 改动完整落到 Windows 与 macOS 桌面包，而不是再维护一套独立桌面业务代码。

## 任务判断

- 当前桌面业务前端只有一套：`apps/app`
- Windows / macOS 共用一个 Tauri 壳：`apps/desktop`
- `apps/desktop/src-tauri/tauri.conf.json` 已明确通过：
  - `beforeBuildCommand = YINJIE_APP_BUILD_BASE=relative pnpm --dir ../app build`
  - `frontendDist = ../../app/dist`
- 这意味着 Web 电脑版的大多数页面改动理论上会自动进入桌面包
- 真正要补的是：
  - 桌面运行时分支是否都兼容 Tauri
  - 新增桌面交互是否需要原生壳能力
  - Windows / macOS 打包、安装、回归链路是否跟上

## 当前基线

### 已确认事实

- `apps/app` 最近连续有大量桌面工作区提交，主要集中在：
  - 聊天工作区
  - 通讯录与资料工作区
  - 朋友圈 / 广场动态 / 视频号
  - 收藏 / 搜索 / 游戏 / 小程序 / 笔记 / 反馈 / 设置
  - `desktop-shell` 导航与工作区框架
- `apps/desktop` 最近只补过一次构建链路修正：
  - `fix(app): use absolute base for web builds`
- `apps/desktop/src-tauri/src/main.rs` 当前只承接少量原生差异：
  - Windows acrylic
  - macOS vibrancy
  - 系统托盘
  - 窗口拖拽 / 最小化 / 最大化 / 关闭
  - 远程服务诊断
- Windows 已有安装包整理脚本：`scripts/build-windows-installers.mjs`
- macOS 目前只有构建命令，尚未看到对等的产物整理 / 发布脚本
- 当前工作区干净，可直接按批次落地并小步提交

### 微信电脑端参考基线

本轮不是去复刻微信，而是把微信电脑端近几个版本已经验证过的处理方式抽象成执行规则，减少我们在桌面端同步时的试错。

当前可核的官方基线主要来自微信 Mac App Store 版本记录：

- `2025-07-29` 的 `4.0.6`
  - 明确提到统一 Windows、Mac 等平台 UI
  - 这说明桌面双平台的第一优先级应是行为和信息架构统一，而不是平台各做各的
- `2025-09-04` 的 `4.1.0`
  - 新增消息提醒
  - 未下载文件可直接保存到电脑
  - 收藏内容可发到聊天
  - 独立聊天窗口和图片窗口支持紧凑尺寸
  - 这说明桌面增强能力应以“小而闭环”的实用功能增量落地
- `2025-09-22` 的 `4.1.1`
  - 支持引用消息的具体片段
  - 引用时可回复图片、视频、表情
  - 支持同时打开多张图片
  - 截图可钉到桌面
  - 这说明桌面能力迭代通常围绕高频内容操作做精细增强
- `2025-10-29` 左右的 `4.1.2`
  - 邀请私聊成员时可分享聊天记录
  - 删除联系人时保留聊天记录
  - 支持打印图片
  - 这说明桌面版本会优先保护上下文连续性，不轻易破坏聊天资产
- `2025-11-17` 的 `4.1.4`
  - 朋友圈评论支持表情和图片
  - 这说明内容流能力是按具体表面逐步放开的，不要求一轮重构全覆盖
- `2025-11-28` 的 `4.1.5`
  - 文件可直接下载到指定目录
  - 支持滚动截图
  - 这说明桌面文件和截图能力需要按原生使用习惯补足
- `2026-02-08` 的 `4.1.7`
  - 新增群待办
  - 这说明桌面版也会继续承接偏协作型、工作流型的轻功能，而不是只做聊天壳

本计划对微信的参考只用于抽取处理原则：

- 统一双平台桌面语义
- 优先补高频闭环而不是一次性大重构
- 桌面增强要保护聊天记录、文件、图片等资产
- 平台差异只留给系统层，不扩散到业务流

备注：

- 当前环境里没有拿到稳定可引用的微信 Windows 官方版本页
- 因此版本参考以微信 Mac App Store 官方记录为主，再结合“4.0.6 已强调 Windows/Mac UI 统一”这一点做跨平台推断

### 当前缺口判断

1. 缺的不是“把 Web 代码复制到 Windows/mac 两份”
2. 缺的是“把 Web 电脑版最近这些改动按桌面包实际运行路径做一次系统接入和验收”
3. 风险最高的地方不是纯 UI，而是：
   - `runtimeConfig.appPlatform === "desktop"` 分支
   - `@tauri-apps/api` 的延迟加载与降级
   - 桌面锁屏、窗口控制、独立页、文件/外链类操作
   - Windows / macOS 打包产物和回归清单不对称
4. 从微信版本处理方式反推，本轮最应避免的错误是：
   - 为了补平台差异而把共享业务逻辑拆裂
   - 为了赶功能而牺牲聊天记录、图片、文件等上下文连续性
   - 没有形成版本化回归清单，导致每次桌面包都重新踩坑

## 完成定义

满足以下条件才算这轮同步完成：

1. `apps/app` 中近期桌面 Web 改动在 Tauri 桌面运行时下都能正常工作
2. 新增桌面交互不再只在浏览器里成立，在 Windows / macOS 原生壳里也有闭环
3. Windows x64、macOS arm64、macOS x86_64 都有明确构建入口和产物整理方式
4. 桌面发布回归清单覆盖：
   - 安装与启动
   - 远程连接
   - 聊天主路径
   - 通讯录 / 内容流 / 工具页
   - 原生窗口行为
   - 平台特有问题
5. 全过程采用小步提交，不混入用户当前未提交改动

## 处理原则

### 一致性优先级

1. 先统一 Web 桌面态和 Tauri 桌面态
2. 再统一 Windows 和 macOS 的桌面业务行为
3. 最后才处理操作系统外观差异

### 微信参考决策

遇到实现分歧时按下面规则裁决：

- 如果是聊天、联系人、内容流的核心行为冲突：
  - 以双平台统一为第一优先级
  - 参考微信 `4.0.6` 的统一 UI 思路
- 如果是独立窗口、图片查看、截图、打印、下载目录问题：
  - 优先做桌面专属的高频实用增强
  - 参考微信 `4.1.0` 到 `4.1.5` 的工具型增量处理
- 如果是删除联系人、清理对象、迁移状态导致上下文丢失：
  - 一律优先保留聊天资产
  - 参考微信 `4.1.2` 的“删除联系人但保留聊天记录”思路
- 如果是朋友圈、视频号、评论等内容链路复杂度过高：
  - 不做一次性过度泛化
  - 参考微信 `4.1.4` 这种逐表面放开的做法
- 如果是仅某平台需要的视觉或交互差异：
  - 差异只允许落在壳层和系统集成
  - 不允许把业务页面复制出平台分叉版本

### 实施禁区

- 不新增 Windows 专属业务页面
- 不新增 macOS 专属业务页面
- 不把 Tauri command 当业务层 API 扩散使用
- 不在没有回归清单的情况下批量改桌面路径

## 问题分型

### P0 桌面主路径阻断

- 桌面包启动空白
- Setup 后无法进入主界面
- 原生窗口按钮无效
- 独立窗口 / 图片窗口无法打开或关闭
- 构建产物损坏或安装失败

### P1 双平台行为不一致

- Windows 和 macOS 进入同一功能后操作路径不同
- Web 桌面态能用，Tauri 桌面态失效
- 某一端托盘、恢复、关闭逻辑与另一端割裂

### P2 桌面增强能力缺口

- 下载、打印、截图、外链、紧凑窗口等桌面实用能力缺闭环
- 文件、图片、聊天记录在桌面上下文里跳转不稳

### P3 发布和回归缺口

- Windows 有脚本，macOS 没有对等产物整理
- 缺少按场景沉淀的回归证据
- 每次发包都要重新人工摸索

## 执行范围

### A. Web 电脑版改动盘点

目标：先把“哪些变动需要同步”收成清单，而不是一上来盲改。

范围：

- `apps/app/src/features/desktop/**`
- `apps/app/src/features/shell/**`
- `apps/app/src/routes/**`
- `apps/app/src/runtime/**`

执行方式：

- 以 2026-04-09 之后的桌面相关提交为起点做分组盘点
- 给每一项改动标记类型：
  - 纯共享前端改动
  - 依赖桌面运行时判断
  - 依赖 Tauri 原生能力
  - 依赖发布/安装链路

产出：

- 一份“桌面 Web 变动 -> Windows/mac 落点”的同步矩阵
- 一份“如果对齐微信桌面处理方式，应该落在壳层还是业务层”的判定表

### B. App 层桌面运行时收口

目标：确保桌面 Web 的业务代码在 Tauri 中不是“能编”，而是真能跑。

重点文件：

- `apps/app/src/features/shell/desktop-shell.tsx`
- `apps/app/src/runtime/adapters/desktop.ts`
- `apps/app/src/runtime/platform.ts`
- 近期桌面改动涉及的工作区页面

重点检查：

- `nativeDesktopShell` 分支是否覆盖完整
- `@tauri-apps/api` 动态导入失败时是否有安全降级
- 浏览器行为是否被误当作原生能力使用
- `localStorage`、独立工作区状态、锁屏状态在桌面包里是否稳定
- 新增桌面工作区是否存在只在 Web 浏览器里有效的链接/跳转/打开方式

完成标准：

- 桌面工作区主路径在浏览器桌面态和 Tauri 桌面态表现一致
- 不再出现原生壳点击无反应、窗口控制失效、状态丢失或错误回退

### C. Tauri 壳能力补齐

目标：把 `apps/app` 里真正需要原生配合的部分落到 `apps/desktop`。

重点文件：

- `apps/desktop/src-tauri/src/main.rs`
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src-tauri/capabilities/default.json`
- `apps/desktop/scripts/run-tauri.mjs`

重点检查：

- 新桌面能力是否需要新增 Tauri command
- 现有窗口控制 command 是否足够覆盖新的桌面交互
- Windows/macOS 的视觉差异是否只停留在 acrylic / vibrancy，而没有遗漏行为差异
- 托盘、主窗口恢复、关闭即隐藏、拖拽区是否仍适配新版桌面壳布局
- 资源路径、构建 base、图标资源在不同平台下是否稳定

预期动作：

- 只补真正必要的原生桥接
- 不把业务逻辑回灌到 Tauri 壳
- 继续保持 remote-connected client 约束
- 所有桥接都要明确回答：
  - 为什么不能留在 `apps/app`
  - 是否同时服务 Windows 和 macOS
  - 是否会影响现有 Web 桌面态

### D. Windows / macOS 发布链路补齐

目标：让“Web 电脑版改动已进入桌面包”从理论成立变成可发布成立。

Windows 侧：

- 延续现有命令：
  - `pnpm desktop:build:windows:x64`
  - `pnpm desktop:installer:windows`
  - `pnpm desktop:release:windows`
- 核对安装包归档目录、版本号、bundle 产物路径是否稳定

macOS 侧：

- 基于现有命令：
  - `pnpm desktop:build:mac:aarch64`
  - `pnpm desktop:build:mac:x86_64`
- 补齐缺失项：
  - 产物整理脚本
  - 发布目录约定
  - 必要的签名 / 公证占位说明

文档侧：

- 扩充桌面发布说明
- 将回归清单从“泛桌面”拆成 Windows / macOS 两端都可执行的验收步骤
- 增加“遇到问题时按微信桌面版本处理方式裁决”的内部说明

### E. 双平台回归

目标：避免“代码进包了，但安装包不可用”。

统一回归项：

- 首启进入 `Splash -> Setup`
- 远程地址配置、重启恢复、健康检查
- 聊天列表 / 单聊 / 群聊
- 通讯录、朋友圈、广场动态、视频号、收藏、搜索、设置
- 世界主人资料、API Key、桌面锁屏
- 窗口拖拽、最小化、最大化、关闭到托盘 / 恢复

Windows 专项：

- 安装包安装 / 卸载
- 托盘恢复与任务栏表现
- MSVC 构建链路和重试逻辑是否稳定

macOS 专项：

- `icon.icns`、`.app` / `.dmg` 产物完整性
- vibrancy、窗口按钮、前后台切换
- 签名 / 公证前后的运行提示风险

证据要求：

- 每个回归项至少留下以下一种证据
  - 命令输出结论
  - 截图
  - 录屏
  - 明确的手工复现结果记录

## 开工前准备

### 代码准备

- 按提交历史拉出 2026-04-09 以来所有桌面相关变更面
- 先锁定这几个高风险入口：
  - `apps/app/src/features/shell/desktop-shell.tsx`
  - `apps/app/src/runtime/adapters/desktop.ts`
  - `apps/app/src/features/desktop/**`
  - `apps/app/src/routes/desktop-*`
  - `apps/desktop/src-tauri/src/main.rs`

### 能力准备

- 确认 `pnpm --filter @yinjie/app build` 能稳定产出桌面前端
- 确认 `pnpm desktop:build` 能继续消费 `apps/app/dist`
- 盘点现有 Tauri command 和前端调用点的一一对应关系
- 明确哪些桌面功能仍只能靠浏览器 fallback，哪些必须改成原生桥接

### 发布准备

- Windows：
  - 确认安装包脚本可继续复用
  - 确认 bundle 目录解析规则没有写死旧结构
- macOS：
  - 明确是否新增产物整理脚本
  - 明确归档目录命名方式
  - 明确签名 / 公证信息先占位还是直接接入

### 参考准备

- 把微信桌面参考能力按主题归类，不按版本死记：
  - 统一 UI
  - 紧凑独立窗口
  - 下载到指定目录
  - 打印 / 截图 / 多图
  - 保留聊天记录
  - 内容流逐步增强

## 关键阻塞与预案

### 阻塞 1：Web 桌面态正常，Tauri 桌面态异常

处理：

- 先查 `runtimeConfig.appPlatform`
- 再查 `@tauri-apps/api` 动态导入与 command fallback
- 最后判断是业务层误判还是壳层能力缺口

### 阻塞 2：Windows 与 macOS 出现不同行为

处理：

- 默认先统一到共享前端
- 只有系统交互差异才下沉到壳层
- 若两端都能统一，禁止分别写平台分支页面

### 阻塞 3：桌面文件 / 图片 / 聊天记录链路易碎

处理：

- 先保上下文和原对象引用
- 再补下载、打印、查看器等增强行为
- 所有清理类操作都先验证“是否保留历史记录”

### 阻塞 4：macOS 发布链路不完整

处理：

- 先补产物整理和目录约定
- 再补签名 / 公证说明
- 不等到所有功能做完才回头补发布

## 批次安排

### 批次 1：盘点与同步矩阵

内容：

- 盘 2026-04-09 以来的桌面 Web 提交
- 列出每个改动在 Windows/mac 是否需要额外处理
- 按微信桌面参考主题给每个改动打标签：
  - `统一行为`
  - `窗口/图片工具`
  - `文件处理`
  - `聊天资产保护`
  - `内容流增强`

提交建议：

- `docs(plan): map desktop web changes to native shells`

### 批次 2：App 层桌面运行时修复

内容：

- 修 `apps/app` 中桌面态与 Tauri 态不一致的问题
- 补桌面分支的降级、状态恢复和跳转闭环
- 优先把高频链路做到和微信桌面同类能力一样稳：
  - 聊天
  - 独立窗口
  - 图片查看
  - 文件入口
  - 删除对象后的历史保留

提交建议：

- `fix(app): align desktop web flows with tauri runtime`

### 批次 3：Tauri 壳补齐

内容：

- 在 `apps/desktop` 中补窗口命令、壳层行为或配置
- 保持业务逻辑仍在 `apps/app`
- 若新增桌面桥接，必须附带一条用途说明：
  - 对标的是哪类微信桌面能力
  - 为什么不能只留在 Web 层

提交建议：

- `feat(desktop): bridge native shell for desktop workspace`

### 批次 4：Windows 发布链路核实

内容：

- 校正 Windows 打包与安装包归档
- 更新回归文档
- 形成 Windows 可重复发包步骤，而不是一次性命令试跑

提交建议：

- `build(desktop): stabilize windows release pipeline`

### 批次 5：macOS 发布链路补齐

内容：

- 增加 macOS 产物整理与发布说明
- 补双架构交付路径
- 把 macOS 作为正式发版对象，而不是“能 build 就算同步完成”

提交建议：

- `build(desktop): add mac release workflow`

### 批次 6：回归证据沉淀

内容：

- 把 Windows / macOS 的关键回归项固化为执行记录模板
- 补“问题 -> 处理 -> 证据 -> 是否和微信桌面处理原则一致”的沉淀格式

提交建议：

- `docs(desktop): capture native parity regression checklist`

## 验证策略

本地可先做的验证：

- `pnpm --filter @yinjie/app typecheck`
- `pnpm --filter @yinjie/app build`
- `pnpm --filter @yinjie/app lint`
- `pnpm desktop:build`

平台机验证：

- Windows：
  - `pnpm desktop:build:windows:x64`
  - `pnpm desktop:installer:windows`
- macOS：
  - `pnpm desktop:build:mac:aarch64`
  - `pnpm desktop:build:mac:x86_64`

注意：

- Windows 和 macOS 的最终安装包验证仍然必须在对应平台主机执行
- 当前 Linux 工作区可以完成共享前端和部分桌面壳静态校验，但不能替代原生安装验证

## 产出要求

除了代码本身，本轮还必须留下这些可复用资产：

- 桌面同步矩阵
- 原生桥接清单
- Windows 发版步骤
- macOS 发版步骤
- 双平台回归证据
- 微信桌面参考决策表

## 执行原则

- 不新建测试文件
- 每一批只改与该批次直接相关的文件
- 每一批完成立即提交
- 不覆盖用户当前未提交改动
- 若发现新的结构变更涉及模块 / 路由 / 实体 / 表，再同步更新 `AGENTS.md`

## 结论

这轮工作的正确做法不是“再做一套 Windows 版和 mac 版前端”，而是：

1. 盘清 `apps/app` 最近的桌面 Web 变动
2. 把需要原生壳支持的点补到 `apps/desktop`
3. 把 Windows / macOS 的构建、产物和回归流程补完整
4. 遇到分歧时，优先按微信桌面近几个版本已经验证过的处理方式做裁决：
   - 统一双平台行为
   - 小步补高频能力
   - 保护聊天资产
   - 把差异压回壳层

按这个路径推进，才能真正做到“Web 电脑版的改动已经同步到 Windows 和 mac 版”。
