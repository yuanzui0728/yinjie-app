import { useParams, useNavigate } from "@tanstack/react-router";
import { AppPage } from "@yinjie/ui";
import { DesktopChatWorkspace } from "../features/desktop/chat/desktop-chat-workspace";
import { OfficialAccountServiceThread } from "../features/official-accounts/service/official-account-service-thread";
import { useDesktopLayout } from "../features/shell/use-desktop-layout";
import { navigateBackOrFallback } from "../lib/history-back";

export function OfficialAccountServicePage() {
  const { accountId } = useParams({
    from: "/official-accounts/service/$accountId",
  });
  const navigate = useNavigate();
  const isDesktopLayout = useDesktopLayout();

  if (isDesktopLayout) {
    return <DesktopChatWorkspace selectedServiceAccountId={accountId} />;
  }

  return (
    <AppPage className="flex h-full min-h-0 flex-col space-y-0 px-0 py-0">
      <OfficialAccountServiceThread
        accountId={accountId}
        onBack={() => {
          navigateBackOrFallback(() => {
            void navigate({ to: "/tabs/chat" });
          });
        }}
      />
    </AppPage>
  );
}
