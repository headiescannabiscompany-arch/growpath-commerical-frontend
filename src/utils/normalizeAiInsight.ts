export type AiComplianceInsight = {
  summary: string;
  risks: string[];
  recommendedActions: { label: string; targetScreen: string; params?: any }[];
  confidence?: "low" | "medium" | "high";
  sourcesUsed?: string[];
};

export function normalizeAiComplianceInsight(res: any): AiComplianceInsight {
  const x = res?.insight || res?.result || res;

  return {
    summary: String(x?.summary || x?.text || "No summary returned."),
    risks: Array.isArray(x?.risks) ? x.risks.map(String) : [],
    recommendedActions: Array.isArray(x?.recommendedActions)
      ? x.recommendedActions.map((a: any) => ({
          label: String(a?.label || "Action"),
          targetScreen: String(a?.targetScreen || ""),
          params: a?.params
        }))
      : [],
    confidence: x?.confidence,
    sourcesUsed: Array.isArray(x?.sourcesUsed) ? x.sourcesUsed.map(String) : []
  };
}
