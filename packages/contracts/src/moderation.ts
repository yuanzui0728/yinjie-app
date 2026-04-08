export type ModerationTargetType = "character" | "message" | "moment" | "feedPost" | "comment";

export interface ModerationReport {
  id: string;
  targetType: ModerationTargetType;
  targetId: string;
  reason: string;
  details?: string;
  status: "open" | "reviewed" | "resolved";
  createdAt: string;
}

export interface CreateModerationReportRequest {
  targetType: ModerationTargetType;
  targetId: string;
  reason: string;
  details?: string;
}
