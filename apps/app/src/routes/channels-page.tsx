import { useNavigate } from "@tanstack/react-router";
import { DesktopPlaceholderWorkspace } from "../features/desktop/desktop-placeholder-workspace";

export function ChannelsPage() {
  const navigate = useNavigate();

  return (
    <DesktopPlaceholderWorkspace
      badge="Channels"
      title="视频号需要独立桌面频道"
      description="视频号不再混在发现里，而是以微信电脑版同层级的内容频道进入，后续再补短视频、直播和创作工具。"
      spotlightTitle="先把桌面频道和直播伴侣入口定住"
      spotlightBody="当前先把一级入口、直播伴侣跳转和工作区承接做好，等视频内容模型稳定后再补真实内容流和创作面板。"
      highlights={[
        {
          label: "频道定位",
          value: "短视频、直播、推荐流和创作者工具统一承接。",
        },
        { label: "直播伴侣", value: "从更多菜单快速进入，不打断主导航节奏。" },
        {
          label: "桌面形态",
          value: "优先三栏或双栏浏览，不做手机式整页跳转。",
        },
        { label: "下一步", value: "补频道实体、视频流、点赞评论与直播状态。" },
      ]}
      ctaLabel="打开直播伴侣入口"
      onCtaClick={() => {
        void navigate({ to: "/desktop/channels/live-companion" });
      }}
    />
  );
}
