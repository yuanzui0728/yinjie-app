import { useNavigate } from "@tanstack/react-router";
import { AppPage } from "@yinjie/ui";
import { MobileSetupPanel } from "../features/mobile/setup/mobile-setup-panel";
import { useWorldOwnerStore } from "../store/world-owner-store";

export function SetupPage() {
  const navigate = useNavigate();
  const onboardingCompleted = useWorldOwnerStore((state) => state.onboardingCompleted);

  function continueIntoWorld() {
    void navigate({
      to: onboardingCompleted ? "/tabs/chat" : "/onboarding",
      replace: true,
    });
  }

  return (
    <AppPage className="pb-8">
      <MobileSetupPanel worldReady={onboardingCompleted} onContinue={continueIntoWorld} />
    </AppPage>
  );
}
