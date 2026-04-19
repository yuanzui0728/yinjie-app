import { isDesktopRuntimeAvailable } from "@yinjie/ui";
import {
  buildDesktopStandaloneWindowLabel,
  openDesktopStandaloneWindow,
} from "../../../runtime/desktop-windowing";
import {
  buildDesktopOfficialArticleWindowPath,
  buildDesktopOfficialArticleWindowRouteHash,
  parseDesktopOfficialArticleWindowRouteHash,
  type DesktopOfficialArticleWindowRouteState,
} from "../../official-accounts/official-article-window-route-state";

export {
  buildDesktopOfficialArticleWindowPath,
  buildDesktopOfficialArticleWindowRouteHash,
  parseDesktopOfficialArticleWindowRouteHash,
  type DesktopOfficialArticleWindowRouteState,
};

function buildDesktopOfficialArticleWindowLabel(articleId: string) {
  return buildDesktopStandaloneWindowLabel(
    "desktop-official-article-window",
    articleId,
  );
}

export async function openDesktopOfficialArticleWindow(
  input: DesktopOfficialArticleWindowRouteState,
) {
  if (typeof window === "undefined") {
    return false;
  }

  const routePath = buildDesktopOfficialArticleWindowPath(input);
  const width = Math.max(980, Math.min(window.screen.availWidth - 120, 1140));
  const height = Math.max(780, Math.min(window.screen.availHeight - 96, 920));
  const left = Math.max(24, Math.round((window.screen.availWidth - width) / 2));
  const top = Math.max(
    24,
    Math.round((window.screen.availHeight - height) / 2),
  );
  const features = [
    "popup=yes",
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
  ].join(",");

  if (!isDesktopRuntimeAvailable()) {
    return Boolean(window.open(routePath, "_blank", features));
  }

  if (
    await openDesktopStandaloneWindow({
      label: buildDesktopOfficialArticleWindowLabel(input.articleId),
      url: routePath,
      title: input.title?.trim() || "公众号文章",
      width,
      height,
      minWidth: 980,
      minHeight: 780,
    })
  ) {
    return true;
  }

  return Boolean(window.open(routePath, "_blank", features));
}
