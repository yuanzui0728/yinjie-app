import { DesktopPlaceholderWorkspace } from "../features/desktop/desktop-placeholder-workspace";

export function GamesPage() {
  return (
    <DesktopPlaceholderWorkspace
      badge="Games"
      title="游戏中心先做桌面入口面板"
      description="这一层先对齐微信电脑版的固定频道入口，后续再补最近玩过、推荐位和活动位，不把导航改造和复杂游戏平台绑定。"
      spotlightTitle="首期优先固定入口和承接面板"
      spotlightBody="先给桌面端留出稳定的游戏中心位置，后续按配置驱动接入活动、入口和状态。"
      highlights={[
        { label: "最近玩过", value: "后续从本地使用记录或服务端配置生成。" },
        { label: "推荐位", value: "适合接官方活动或世界内互动玩法。" },
        {
          label: "承接方式",
          value: "首期可从卡片面板打开，不必先做复杂运行容器。",
        },
        { label: "下一步", value: "补配置源和游戏卡片协议。" },
      ]}
    />
  );
}
