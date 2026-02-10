// AI4 Dashboard Data Contract
// Deterministic, additive, no magic

export interface ComplianceStatus {
  level: "green" | "yellow" | "red";
  summary: string; // e.g. "All systems nominal", "Minor deviations detected", "Critical issues present"
  latestReportId: string;
}

export interface TrendSignal {
  label: string; // e.g. "Compliance improving vs last 3 weeks"
  value: string; // e.g. "+12%", "Recurring deviation: irrigation timing"
  type: "improvement" | "decline" | "recurring";
}

export interface AIComparisonHighlight {
  summary: string; // 1–2 sentences max
  sourceReportId?: string; // optional, for deep link
}

export interface ActionQueueItem {
  label: string; // e.g. "Review SOP: Dry Room Airflow"
  type: "sop" | "deviation";
  targetId: string; // SOP or deviation id
}

export interface AI4DashboardData {
  complianceStatus: ComplianceStatus;
  trendSignals: TrendSignal[];
  aiComparisonHighlights: AIComparisonHighlight[];
  actionQueue: ActionQueueItem[];
}

// Example placeholder data
export const exampleAI4DashboardData: AI4DashboardData = {
  complianceStatus: {
    level: "yellow",
    summary: "Minor deviations detected",
    latestReportId: "weekly-2026-02-01"
  },
  trendSignals: [
    { label: "Compliance improving vs last 3 weeks", value: "+8%", type: "improvement" },
    { label: "Recurring deviation: EC drift", value: "Week 6", type: "recurring" }
  ],
  aiComparisonHighlights: [
    { summary: "Facility compliance is trending up, but EC drift remains unresolved." },
    { summary: "Airflow SOP completion improved, but deviation flagged in Dry Room." }
  ],
  actionQueue: [
    { label: "Review SOP: Dry Room Airflow", type: "sop", targetId: "sop-123" },
    {
      label: "Investigate deviation: EC drift (Week 6)",
      type: "deviation",
      targetId: "dev-456"
    }
  ]
};
