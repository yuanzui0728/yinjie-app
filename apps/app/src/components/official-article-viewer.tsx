import type { OfficialAccountArticleDetail } from "@yinjie/contracts";
import { formatTimestamp } from "../lib/format";

export function OfficialArticleViewer({
  article,
  accountName,
}: {
  article: OfficialAccountArticleDetail;
  accountName?: string;
}) {
  return (
    <article className="mx-auto w-full max-w-[760px] rounded-[28px] border border-[color:var(--border-faint)] bg-white/94 px-5 py-6 shadow-[var(--shadow-section)] sm:px-8">
      <div className="text-xs uppercase tracking-[0.26em] text-[color:var(--text-muted)]">
        {accountName ?? article.account.name}
      </div>
      <h1 className="mt-3 text-[28px] font-semibold leading-[1.35] text-[color:var(--text-primary)]">
        {article.title}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[color:var(--text-muted)]">
        <span>{article.authorName}</span>
        <span>{formatTimestamp(article.publishedAt)}</span>
        <span>{article.readCount} 阅读</span>
      </div>
      <div className="mt-6 rounded-[22px] bg-[rgba(249,115,22,0.05)] px-4 py-3 text-sm leading-7 text-[color:var(--text-secondary)]">
        {article.summary}
      </div>
      <div
        className="official-article-content mt-7 space-y-4 text-[15px] leading-8 text-[color:var(--text-primary)] [&_blockquote]:rounded-[20px] [&_blockquote]:border-l-4 [&_blockquote]:border-[rgba(249,115,22,0.45)] [&_blockquote]:bg-[rgba(249,115,22,0.06)] [&_blockquote]:px-4 [&_blockquote]:py-3 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:rounded-[20px] [&_p]:my-0"
        dangerouslySetInnerHTML={{ __html: article.contentHtml }}
      />
    </article>
  );
}
