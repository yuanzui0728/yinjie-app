import { DesktopPlaceholderWorkspace } from "../features/desktop/desktop-placeholder-workspace";

export function MiniProgramsPage() {
  return (
    <DesktopPlaceholderWorkspace
      badge="Mini Programs"
      title="小程序面板先做桌面启动器"
      description="桌面小程序面板先承接最近使用和固定入口，不把这次改造直接拉成完整的小程序运行时工程。"
      spotlightTitle="先统一入口，再决定运行方式"
      spotlightBody="首期先给出桌面启动器和最近使用区域，后续再根据业务需要选择内嵌、工作区页签或外部窗口承接。"
      highlights={[
        { label: "最近使用", value: "优先展示常用面板和最近打开的小程序。" },
        { label: "收藏入口", value: "后续可和收藏体系联动，支持固定常用项。" },
        { label: "运行策略", value: "先不绑定独立运行时，避免过早重投入。" },
        { label: "下一步", value: "补小程序清单协议和打开策略。" },
      ]}
    />
  );
}
