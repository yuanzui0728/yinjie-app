import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { DesktopSearchWorkspace } from "../features/search/desktop-search-workspace";
import {
  clearSearchHistory,
  loadSearchHistory,
  pushSearchHistory,
  removeSearchHistory,
} from "../features/search/search-history";
import { MobileSearchWorkspace } from "../features/search/mobile-search-workspace";
import type {
  SearchCategory,
  SearchResultItem,
} from "../features/search/search-types";
import { useSearchIndex } from "../features/search/use-search-index";
import { useDesktopLayout } from "../features/shell/use-desktop-layout";

export function SearchPage() {
  const navigate = useNavigate();
  const isDesktopLayout = useDesktopLayout();
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState<SearchCategory>("all");
  const [history, setHistory] = useState(() => loadSearchHistory());
  const {
    error,
    filteredResults,
    groupedResults,
    hasKeyword,
    loading,
    matchedCounts,
    scopeCounts,
    searchingMessages,
  } = useSearchIndex(searchText, activeCategory);

  function handleCommitSearch(keyword: string) {
    setHistory(pushSearchHistory(keyword));
  }

  function handleApplyHistory(keyword: string) {
    setSearchText(keyword);
    setHistory(pushSearchHistory(keyword));
  }

  function handleRemoveHistory(keyword: string) {
    setHistory(removeSearchHistory(keyword));
  }

  function handleClearHistory() {
    setHistory(clearSearchHistory());
  }

  function handleOpenResult(item: SearchResultItem) {
    handleCommitSearch(searchText);
    void navigate({
      to: item.to as never,
      hash: item.hash,
    });
  }

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }

    void navigate({ to: "/tabs/chat" });
  }

  if (isDesktopLayout) {
    return (
      <DesktopSearchWorkspace
        activeCategory={activeCategory}
        error={error}
        groupedResults={groupedResults}
        hasKeyword={hasKeyword}
        history={history}
        loading={loading}
        matchedCounts={matchedCounts}
        onApplyHistory={handleApplyHistory}
        onClearHistory={handleClearHistory}
        onClearKeyword={() => setSearchText("")}
        onCommitSearch={handleCommitSearch}
        onOpenResult={handleOpenResult}
        onRemoveHistory={handleRemoveHistory}
        scopeCounts={scopeCounts}
        searchText={searchText}
        searchingMessages={searchingMessages}
        setActiveCategory={setActiveCategory}
        setSearchText={setSearchText}
        visibleResults={filteredResults}
      />
    );
  }

  return (
    <MobileSearchWorkspace
      activeCategory={activeCategory}
      error={error}
      groupedResults={groupedResults}
      hasKeyword={hasKeyword}
      history={history}
      loading={loading}
      matchedCounts={matchedCounts}
      onApplyHistory={handleApplyHistory}
      onBack={handleBack}
      onClearHistory={handleClearHistory}
      onClearKeyword={() => setSearchText("")}
      onCommitSearch={handleCommitSearch}
      onOpenResult={handleOpenResult}
      onRemoveHistory={handleRemoveHistory}
      scopeCounts={scopeCounts}
      searchText={searchText}
      searchingMessages={searchingMessages}
      setActiveCategory={setActiveCategory}
      setSearchText={setSearchText}
      visibleResults={filteredResults}
    />
  );
}
