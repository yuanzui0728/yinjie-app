import { DesktopPlaceholderWorkspace } from "../features/desktop/desktop-placeholder-workspace";

export function SearchPage() {
  return (
    <DesktopPlaceholderWorkspace
      badge="Search"
      title="搜一搜应该跨消息和内容流"
      description="桌面版搜一搜会统一承接消息、联系人、公众号、朋友圈和广场动态，做成稳定的全局检索工作区。"
      spotlightTitle="首期先预留全局搜索工作区"
      spotlightBody="当前仓库已经有会话检索和内容列表基础，后续可先做前端聚合搜索，再逐步下沉到后端搜索接口。"
      highlights={[
        { label: "消息", value: "按会话标题和消息内容聚合搜索。" },
        { label: "通讯录", value: "直接跳到好友、群聊和公众号详情。" },
        {
          label: "内容流",
          value: "朋友圈与广场动态结果在同一工作区对比展示。",
        },
        { label: "下一步", value: "补分类结果列表、预览卡和跳转状态。" },
      ]}
    />
  );
}
