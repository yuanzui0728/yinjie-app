import { useNavigate } from "@tanstack/react-router";
import { AppPage } from "@yinjie/ui";
import { MobileSetupPanel } from "../features/mobile/setup/mobile-setup-panel";
import { useSessionStore } from "../store/session-store";

export function SetupPage() {
  const navigate = useNavigate();
  const token = useSessionStore((state) => state.token);

  function continueIntoWorld() {
    void navigate({
      to: token ? "/tabs/chat" : "/onboarding",
      replace: true,
    });
  }

  return (
    <AppPage className="pb-8">
      <MobileSetupPanel token={token} onContinue={continueIntoWorld} />
    </AppPage>
  );
}
