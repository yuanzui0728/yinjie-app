import {
  searchCategoryLabels,
  type SearchCategory,
} from "./search-types";

export type SearchRouteSource = "chat" | "contacts";

export type SearchRouteState = {
  category: SearchCategory;
  keyword: string;
  source?: SearchRouteSource;
};

const DEFAULT_SEARCH_ROUTE_STATE: SearchRouteState = {
  category: "all",
  keyword: "",
  source: "chat",
};

const validSearchCategories = new Set(
  searchCategoryLabels.map((item) => item.id),
);
const validSearchSources = new Set<SearchRouteSource>(["chat", "contacts"]);

export function parseSearchRouteState(hash: string): SearchRouteState {
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!normalizedHash) {
    return DEFAULT_SEARCH_ROUTE_STATE;
  }

  const params = new URLSearchParams(normalizedHash);
  const keyword = params.get("q")?.trim() ?? "";
  const category = params.get("category")?.trim();
  const source = params.get("source")?.trim();
  const normalizedSource = validSearchSources.has(source as SearchRouteSource)
    ? (source as SearchRouteSource)
    : DEFAULT_SEARCH_ROUTE_STATE.source;

  if (!category || !validSearchCategories.has(category as SearchCategory)) {
    return {
      ...DEFAULT_SEARCH_ROUTE_STATE,
      keyword,
      source: normalizedSource,
    };
  }

  return {
    category: category as SearchCategory,
    keyword,
    source: normalizedSource,
  };
}

export function buildSearchRouteHash(state: SearchRouteState) {
  const params = new URLSearchParams();
  const keyword = state.keyword.trim();
  const source = state.source ?? DEFAULT_SEARCH_ROUTE_STATE.source;

  if (keyword) {
    params.set("q", keyword);
  }

  if (state.category !== "all") {
    params.set("category", state.category);
  }

  if (source && source !== DEFAULT_SEARCH_ROUTE_STATE.source) {
    params.set("source", source);
  }

  return params.toString() || undefined;
}
