import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { buildDesktopContactsRouteHash } from "../contacts/desktop-contacts-route-state";
import { buildDesktopOfficialArticleWindowRouteHash } from "./desktop-official-article-window-route-state";

type DesktopOfficialArticleRouteShellProps = {
  articleId: string;
};

export function DesktopOfficialArticleRouteShell({
  articleId,
}: DesktopOfficialArticleRouteShellProps) {
  const navigate = useNavigate();
  const contactsHash = useMemo(
    () =>
      buildDesktopContactsRouteHash({
        pane: "official-accounts",
        articleId,
      }),
    [articleId],
  );

  useEffect(() => {
    void navigate({
      to: "/desktop/official-article-window",
      hash: buildDesktopOfficialArticleWindowRouteHash({
        articleId,
        returnTo: `/tabs/contacts${contactsHash ? `#${contactsHash}` : ""}`,
      }),
      replace: true,
    });
  }, [articleId, contactsHash, navigate]);

  return null;
}
