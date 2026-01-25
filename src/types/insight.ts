// Canonical Insight type for analytics/decision engine
export type InsightType = "RISK" | "EFFICIENCY" | "COMPLIANCE" | "AUTOMATION";

export type InsightEvidence = {
  metric: string; // e.g. "overdue_tasks_7d"
  value: number | string;
  baseline?: number;
  trend?: "up" | "down" | "flat";
};

export type InsightAction =
  | {
      kind: "CREATE_TASK";
      payload: {
        title: string;
        description?: string;
        priority?: "low" | "normal" | "high";
      };
    }
  | { kind: "NAVIGATE"; payload: { route: string; params?: Record<string, any> } }
  | { kind: "ENABLE_AUTOMATION"; payload: { policyType: string } };

export type InsightStatus = "open" | "resolved" | "snoozed";

export interface Insight {
  id: string;
  facilityId: string;
  type: InsightType;
  score: number; // 0–100
  title: string;
  explanation: string;
  recommendation: string;
  createdAt: string;
  evidence?: InsightEvidence[];
  actions?: InsightAction[];
  severity?: "low" | "medium" | "high";
  confidence?: number; // 0–1
  status?: InsightStatus;
}
