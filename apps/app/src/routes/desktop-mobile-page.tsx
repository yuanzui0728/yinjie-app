import { DesktopPlaceholderWorkspace } from "../features/desktop/desktop-placeholder-workspace";

export function DesktopMobilePage() {
  return (
    <DesktopPlaceholderWorkspace
      badge="Mobile"
      title="手机入口先承接设备联动"
      description="这不是一个普通一级业务页，而是桌面壳底部的设备面板，用来连接手机端的继续操作、互传和状态查看。"
      spotlightTitle="保持壳级能力，不和业务频道混排"
      spotlightBody="先把手机入口收在底部，后续再补设备状态、文件互传或跨端继续浏览能力。"
      highlights={[
        { label: "设备状态", value: "后续展示手机端连接状态和最近活跃时间。" },
        { label: "继续浏览", value: "支持把桌面内容切到手机端继续查看。" },
        { label: "文件联动", value: "后续可扩展到聊天附件与跨端互传。" },
        { label: "当前阶段", value: "优先保留壳级位置，避免日后入口再搬家。" },
      ]}
    />
  );
}
