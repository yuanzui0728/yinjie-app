import { DesktopPlaceholderWorkspace } from "../features/desktop/desktop-placeholder-workspace";

export function DesktopFeedbackPage() {
  return (
    <DesktopPlaceholderWorkspace
      badge="Feedback"
      title="意见反馈先把桌面提交面板预留好"
      description="桌面反馈页会统一承接问题描述、实例信息、版本信息和诊断上下文，先把承接面板固定下来，再补实际提交通道。"
      spotlightTitle="先稳定反馈入口，再接提交流"
      spotlightBody="当前仓库还没有独立反馈接口，先把桌面承接页和需要携带的上下文确定下来，后续再接 webhook 或正式后端。"
      highlights={[
        { label: "问题描述", value: "支持文本反馈和复现步骤整理。" },
        { label: "实例信息", value: "自动带上世界地址、平台和版本信息。" },
        { label: "诊断上下文", value: "后续可补日志摘要和设备状态。" },
        { label: "下一步", value: "补反馈提交接口或投递通道。" },
      ]}
    />
  );
}
