import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppPage, AppSection, InlineNotice } from "@yinjie/ui";
import { useSessionStore } from "../store/session-store";

export function SetupPage() {
  const navigate = useNavigate();
  const token = useSessionStore((state) => state.token);

  useEffect(() => {
    void navigate({
      to: token ? "/tabs/chat" : "/onboarding",
      replace: true,
    });
  }, [navigate, token]);

  return (
    <AppPage className="flex min-h-full flex-col items-center justify-center py-10 text-center">
      <AppSection className="w-full max-w-sm px-8 py-10">
        <InlineNotice tone="info">正在带你回到隐界。</InlineNotice>
      </AppSection>
    </AppPage>
  );
}
