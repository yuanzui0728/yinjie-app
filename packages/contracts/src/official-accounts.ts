export type OfficialAccountType = "subscription" | "service";

export interface OfficialAccountArticleSummary {
  id: string;
  accountId: string;
  title: string;
  summary: string;
  coverImage?: string;
  authorName: string;
  publishedAt: string;
  isPinned: boolean;
  readCount: number;
}

export interface OfficialAccountSummary {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  description: string;
  accountType: OfficialAccountType;
  coverImage?: string;
  isVerified: boolean;
  isFollowing: boolean;
  lastPublishedAt?: string;
  recentArticle?: OfficialAccountArticleSummary;
}

export interface OfficialAccountDetail extends OfficialAccountSummary {
  articles: OfficialAccountArticleSummary[];
}

export interface OfficialAccountArticleDetail
  extends OfficialAccountArticleSummary {
  account: OfficialAccountSummary;
  contentHtml: string;
  relatedArticles: OfficialAccountArticleSummary[];
}
