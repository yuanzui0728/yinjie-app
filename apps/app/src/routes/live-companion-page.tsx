import { DesktopPlaceholderWorkspace } from "../features/desktop/desktop-placeholder-workspace";

export function LiveCompanionPage() {
  return (
    <DesktopPlaceholderWorkspace
      badge="Live Companion"
      title="视频号直播伴侣先提供桌面承接位"
      description="直播伴侣应该从更多菜单快速进入，并保持独立工具语义，不和视频号主频道内容流混排。"
      spotlightTitle="先稳定工具入口，再补直播控制能力"
      spotlightBody="当前先把桌面工具面板和跳转路径固定下来，后续再补直播状态、推流配置和互动控台。"
      highlights={[
        { label: "入口路径", value: "更多菜单直达，不挤占左栏主频道顺序。" },
        { label: "工具定位", value: "独立于视频号内容流的创作工具工作区。" },
        { label: "后续能力", value: "推流控制、状态看板、评论与通知承接。" },
        { label: "当前阶段", value: "先确保路径稳定，避免后续入口变动。" },
      ]}
    />
  );
}
