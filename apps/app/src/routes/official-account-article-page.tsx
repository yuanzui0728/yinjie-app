import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { getOfficialAccountArticle } from "@yinjie/contracts";
import {
  AppPage,
  Button,
  ErrorBlock,
  LoadingBlock,
} from "@yinjie/ui";
import { OfficialArticleViewer } from "../components/official-article-viewer";
import { DesktopOfficialAccountsWorkspace } from "../features/desktop/official-accounts/desktop-official-accounts-workspace";
import { useDesktopLayout } from "../features/shell/use-desktop-layout";
import { useAppRuntimeConfig } from "../runtime/runtime-config-store";

export function OfficialAccountArticlePage() {
  const { articleId } = useParams({
    from: "/official-accounts/articles/$articleId",
  });
  const isDesktopLayout = useDesktopLayout();

  if (isDesktopLayout) {
    return (
      <DesktopOfficialAccountsWorkspace selectedArticleId={articleId} />
    );
  }

  return <MobileOfficialAccountArticlePage articleId={articleId} />;
}

function MobileOfficialAccountArticlePage({ articleId }: { articleId: string }) {
  const navigate = useNavigate();
  const runtimeConfig = useAppRuntimeConfig();
  const baseUrl = runtimeConfig.apiBaseUrl;

  const articleQuery = useQuery({
    queryKey: ["app-official-account-article", baseUrl, articleId],
    queryFn: () => getOfficialAccountArticle(articleId, baseUrl),
  });

  const article = articleQuery.data;

  return (
    <AppPage className="space-y-5">
      <div className="flex items-center justify-between">
        <Button
          onClick={() => {
            if (article?.account.id) {
              void navigate({
                to: "/official-accounts/$accountId",
                params: { accountId: article.account.id },
              });
              return;
            }

            void navigate({ to: "/contacts/official-accounts" });
          }}
          variant="ghost"
          size="icon"
          className="text-[color:var(--text-secondary)]"
        >
          <ArrowLeft size={18} />
        </Button>
      </div>

      {articleQuery.isLoading ? <LoadingBlock label="正在读取文章..." /> : null}
      {articleQuery.isError && articleQuery.error instanceof Error ? (
        <ErrorBlock message={articleQuery.error.message} />
      ) : null}

      {article ? <OfficialArticleViewer article={article} /> : null}
    </AppPage>
  );
}
