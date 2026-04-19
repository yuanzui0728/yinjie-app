import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  buildDesktopContactsRouteHash,
  type DesktopContactsPane,
} from "./desktop-contacts-route-state";

type DesktopContactsRouteRedirectShellProps = {
  pane: DesktopContactsPane;
  characterId?: string;
  accountId?: string;
  articleId?: string;
  officialMode?: "feed" | "accounts";
  showWorldCharacters?: boolean;
};

export function DesktopContactsRouteRedirectShell({
  pane,
  characterId,
  accountId,
  articleId,
  officialMode,
  showWorldCharacters = false,
}: DesktopContactsRouteRedirectShellProps) {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({
      to: "/tabs/contacts",
      hash: buildDesktopContactsRouteHash({
        pane,
        characterId,
        accountId,
        articleId,
        officialMode,
        showWorldCharacters,
      }),
      replace: true,
    });
  }, [
    accountId,
    articleId,
    characterId,
    navigate,
    officialMode,
    pane,
    showWorldCharacters,
  ]);

  return null;
}
