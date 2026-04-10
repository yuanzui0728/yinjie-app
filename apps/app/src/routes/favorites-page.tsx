import { useNavigate } from "@tanstack/react-router";
import { DesktopPlaceholderWorkspace } from "../features/desktop/desktop-placeholder-workspace";

export function FavoritesPage() {
  const navigate = useNavigate();

  return (
    <DesktopPlaceholderWorkspace
      badge="Favorites"
      title="收藏把重要内容统一收住"
      description="对齐微信电脑版的收藏入口，把聊天文本、文件、文章和内容流统一收口到一个桌面工作区里。"
      spotlightTitle="先统一收藏协议，再补真实入库能力"
      spotlightBody="首期先把桌面入口稳定下来，后续再补跨内容类型收藏模型，避免现在做一堆互不兼容的假收藏。"
      highlights={[
        { label: "聊天内容", value: "后续接文本、图片、文件等消息收藏。" },
        { label: "内容流", value: "朋友圈、广场动态和公众号文章统一承接。" },
        { label: "桌面路径", value: "保持左栏固定一级入口，支持搜索和筛选。" },
        { label: "下一步", value: "补 favorites 模块、契约和收藏操作入口。" },
      ]}
      ctaLabel="先去看看聊天文件"
      onCtaClick={() => {
        void navigate({ to: "/desktop/chat-files" });
      }}
    />
  );
}
