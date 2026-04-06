# iOS App Store Submission Checklist

日期：2026-04-06
适用范围：`apps/app` + `apps/ios-shell`

## 目标

把 iOS 提审所需的材料、权限用途文案、审核说明和验证项提前固化到仓库内，避免最后阶段临时补材料。

## 1. App Store Connect 元数据

需要准备：

1. App Name
2. Subtitle
3. Description
4. Keywords
5. Support URL
6. Privacy Policy URL
7. Marketing URL 可选
8. 版本说明
9. 审核备注

建议文案方向：

- App Name: `隐界`
- Subtitle: `你的 AI 社交世界`
- 核心描述：强调聊天、动态、发现、角色互动、用户安全治理能力

## 2. 审核说明

需要在 Review Notes 中明确：

1. App 使用远程 Core API，不在设备本地拉起服务进程
2. 账号可在 App 内删除
3. 含 UGC 的位置包括聊天、朋友圈、发现页评论
4. 举报和屏蔽入口所在位置
5. 如果需要测试账号，提供账号与路径

## 3. 隐私营养标签梳理

当前需要申报/复核的数据类型：

1. 账号标识
2. 用户生成内容
3. 诊断日志
4. 使用数据

需要明确：

1. 是否与身份关联
2. 是否用于追踪
3. 是否仅用于功能实现和安全审计

## 4. 权限与用途文案

当前建议预留的 iOS 权限文案：

1. 推送通知
2. 相册读取
3. 相机拍摄
4. 麦克风

其中后 3 项当前业务还未正式启用，但如果壳工程后续接原生能力，需要在 `Info.plist` 中补齐文案。

## 5. 上架前必须通过的产品路径

1. 首次启动
2. Onboarding / Login
3. 会话列表
4. 单聊
5. 群聊
6. 朋友圈
7. 发现页
8. 举报
9. 屏蔽 / 解除屏蔽
10. 删除账号
11. 退出登录

## 6. 仍待完成的 iOS 专项

1. Keychain/安全存储原生 plugin 真正落地
2. Push 能力
3. Privacy Manifest
4. Xcode 工程与签名
5. 真机回归

## 7. 仓库内已提供的辅助草案

1. `docs/ios-review-notes-template.md`
2. `docs/ios-test-account-template.md`
3. `docs/ios-app-store-metadata-draft.md`
4. `apps/ios-shell/ios-permissions.example.json`
5. `docs/ios-preflight-p0-p1.md`
