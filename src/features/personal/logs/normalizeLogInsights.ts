export type LogInsightSuggestions = {
  tags: string[];
  summary: string;
  missingData: string[];
  suggestedTask: string;
  source: string;
};

function strings(value: unknown) {
  return Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map(String)
            .map((item) => item.trim())
            .filter(Boolean)
        )
      )
    : [];
}

export function normalizeLogInsightSuggestions(response: any): LogInsightSuggestions {
  const row =
    response?.data?.insight ??
    response?.insight ??
    response?.result ??
    response?.data ??
    response ??
    {};
  return {
    tags: strings(row?.suggestedTags ?? row?.tags),
    summary: String(row?.summary || row?.draftSummary || row?.aiExplanation || ""),
    missingData: strings(row?.missingData),
    suggestedTask: String(row?.suggestedTask || row?.followUpTask || ""),
    source: String(
      row?.provider || row?.analysisProvider || row?.sourceType || "unverified"
    )
  };
}
