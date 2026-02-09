// Deterministic sort for recommended SOPs: title ASC, then sopId ASC
function sortRecommendedSops<T extends { title: string; sopId: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const titleCmp = a.title.localeCompare(b.title);
    if (titleCmp !== 0) return titleCmp;
    return a.sopId.localeCompare(b.sopId);
  });
}
// Pure deterministic builder for AI4 Dashboard
// No Date.now(), no routing, no placeholder outputs

import {
  AI4DashboardData,
  ComplianceStatus
} from "@/app/home/facility/compliance/ai4.dashboard.contract";

export type WeeklyComplianceReport = {
  id: string;
  facilityId: string;
  createdAt?: string;
  weekStart?: string;
  overallStatus?: "green" | "yellow" | "red";
  summary?: string;
  score?: number;
  deviations?: Array<{ code: string; label: string; severity: "LOW" | "MED" | "HIGH" }>;
};

export type SavedComparison = {
  id: string;
  facilityId: string;
  createdAt: string;
  headlineSummary: string;
  keyChanges: string[];
};

import type {
  DeviationsSummaryResponse,
  SopsRecommendedResponse
} from "./complianceDashboardApi.contract";

export type BuildDashboardModelArgs = {
  facilityId: string;
  nowISO: string;
  reports: WeeklyComplianceReport[];
  comparisons?: SavedComparison[];
  deviationsSummary?: DeviationsSummaryResponse | null;
  sopsRecommended?: SopsRecommendedResponse | null;
};

export function buildDashboardModel({
  facilityId,
  nowISO,
  reports,
  comparisons,
  deviationsSummary,
  sopsRecommended
}: BuildDashboardModelArgs): AI4DashboardData {
  // Filter reports for facility
  const facilityReports = reports.filter((r) => r.facilityId === facilityId);
  // Sort by createdAt or weekStart descending
  const sorted = [...facilityReports].sort((a, b) => {
    const aTime = new Date(a.createdAt || a.weekStart || "1970-01-01").getTime();
    const bTime = new Date(b.createdAt || b.weekStart || "1970-01-01").getTime();
    return bTime - aTime;
  });

  // Compliance Status
  let complianceStatus: ComplianceStatus;
  if (sorted.length === 0) {
    complianceStatus = {
      level: "red",
      summary: "No weekly reports found",
      latestReportId: ""
    };
  } else {
    const latest = sorted[0];
    complianceStatus = {
      level: latest.overallStatus || "yellow",
      summary: latest.summary || "Report available",
      latestReportId: latest.id
    };
  }

  // Trend Signals
  let trendSignals: any[] = [];
  if (sorted.length >= 2) {
    const scores = sorted.slice(0, 4).map((r) => r.score || 0);
    const delta = scores[0] - scores[scores.length - 1];
    trendSignals.push({
      label: "Compliance trend (last 4)",
      value: `${delta >= 0 ? "+" : ""}${delta}%`,
      type: delta >= 0 ? "improvement" : "decline"
    });
  }

  // Recurring Deviations: prefer backend, else local
  let recurringDeviations: Array<{
    code: string;
    label: string;
    count: number;
    lastSeenAt: string;
    severity: string;
  }> = [];
  if (
    deviationsSummary &&
    Array.isArray(deviationsSummary.recurringDeviations) &&
    deviationsSummary.recurringDeviations.length > 0
  ) {
    recurringDeviations = deviationsSummary.recurringDeviations
      .filter((d) => d && d.code && d.lastSeenAt)
      .map((d) => ({
        code: String(d.code),
        label: String(d.label || d.code),
        count: Number.isFinite(d.count) ? Math.max(0, d.count) : 0,
        lastSeenAt: String(d.lastSeenAt),
        severity: ["LOW", "MED", "HIGH"].includes(d.severity) ? d.severity : "LOW"
      }))
      .slice(0, 5);
  } else {
    // Local fallback
    const deviationCounts: Record<
      string,
      { code: string; label: string; count: number; lastSeenAt: string; severity: string }
    > = {};
    sorted.slice(0, 4).forEach((r) => {
      (r.deviations || []).forEach((dev: any) => {
        if (!deviationCounts[dev.code]) {
          deviationCounts[dev.code] = {
            ...dev,
            count: 0,
            lastSeenAt: r.createdAt || r.weekStart
          };
        }
        deviationCounts[dev.code].count++;
        deviationCounts[dev.code].lastSeenAt = r.createdAt || r.weekStart;
      });
    });
    recurringDeviations = Object.values(deviationCounts)
      .filter((d) => d.count > 1)
      .map((d) => ({
        ...d,
        count: Math.max(0, d.count),
        severity: ["LOW", "MED", "HIGH"].includes(d.severity) ? d.severity : "LOW"
      }))
      .slice(0, 5);
  }

  // AI Comparison Highlights
  let aiComparisonHighlights: any[] = [];
  if (comparisons && comparisons.length > 0) {
    const facilityComparisons = comparisons.filter((c) => c.facilityId === facilityId);
    const sortedComp = [...facilityComparisons].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (sortedComp.length > 0) {
      const latestComp = sortedComp[0];
      aiComparisonHighlights.push({
        summary: latestComp.headlineSummary.slice(0, 140),
        keyChanges: latestComp.keyChanges.slice(0, 3),
        sourceReportId: latestComp.id
      });
    }
  }

  // Recommended SOPs: prefer backend, else []
  let recommendedSops: Array<{ sopId: string; title: string; reason: string }> = [];
  if (
    sopsRecommended &&
    Array.isArray(sopsRecommended.recommendedSops) &&
    sopsRecommended.recommendedSops.length > 0
  ) {
    // ⚠️ DO NOT CHANGE ORDER: enforced by buildDashboardModel.test.ts
    const recommendedSopsRaw = sopsRecommended.recommendedSops
      .filter((s) => s && s.sopId && s.title)
      .map((s) => ({
        sopId: String(s.sopId),
        title: String(s.title),
        reason: String(s.reason || "")
      }));
    recommendedSops = sortRecommendedSops(recommendedSopsRaw).slice(0, 5);
  }

  // Action Queue: open high severity deviations, then recurring, then SOPs
  const actionQueue: any[] = [];
  // 1. Open deviations (HIGH → MED → LOW)
  if (deviationsSummary && Array.isArray(deviationsSummary.openDeviations)) {
    ["HIGH", "MED", "LOW"].forEach((sev) => {
      deviationsSummary
        .openDeviations!.filter((d) => d.severity === sev)
        .forEach((d) => {
          actionQueue.push({
            label: `Investigate deviation: ${d.label}`,
            type: "deviation",
            targetId: d.id
          });
        });
    });
  }
  // 2. Recurring deviations (by count desc, then lastSeenAt desc)
  recurringDeviations
    .sort(
      (a, b) =>
        b.count - a.count ||
        new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
    )
    .forEach((d) => {
      actionQueue.push({
        label: `Recurring deviation: ${d.label}`,
        type: "deviation",
        targetId: d.code
      });
    });
  // 3. Recommended SOPs
  recommendedSops.forEach((s) => {
    actionQueue.push({
      label: `Review SOP: ${s.title}`,
      type: "sop",
      targetId: s.sopId
    });
  });

  return {
    complianceStatus,
    trendSignals,
    aiComparisonHighlights,
    actionQueue
  };
}
