import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  buildDesktopContactsRouteHash,
  type DesktopContactsPane,
} from "./contacts-route-state";

export type ContactsRouteRedirectShellProps = {
  pane: DesktopContactsPane;
  characterId?: string;
  accountId?: string;
  articleId?: string;
  officialMode?: "feed" | "accounts";
  showWorldCharacters?: boolean;
};

export function ContactsRouteRedirectShell({
  pane,
  characterId,
  accountId,
  articleId,
  officialMode,
  showWorldCharacters = false,
}: ContactsRouteRedirectShellProps) {
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
