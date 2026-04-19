import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { buildDesktopContactsRouteHash } from "../contacts/contacts-route-state";
import { buildDesktopOfficialArticleWindowRouteHash } from "./official-article-window-route-state";

export type OfficialArticleRouteShellProps = {
  articleId: string;
};

export function OfficialArticleRouteShell({
  articleId,
}: OfficialArticleRouteShellProps) {
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
