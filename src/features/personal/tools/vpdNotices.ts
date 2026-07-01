import type { ToolResultNotice } from "./ToolResultSurface";

export function buildVpdNotices(serverResult: any): ToolResultNotice[] {
  if (!serverResult) return [];
  const notices: ToolResultNotice[] = [];
  if (serverResult.status && serverResult.status !== "in_range") {
    notices.push({
      key: "target-status",
      severity: "medium",
      message: `VPD is ${String(serverResult.status).replaceAll("_", " ")} for the selected target.`,
      remediation: "Confirm leaf temperature and adjust temperature or RH gradually."
    });
  }
  (Array.isArray(serverResult.warnings) ? serverResult.warnings : []).forEach(
    (message: string, index: number) => {
      notices.push({
        key: `warning-${index}`,
        severity: "medium",
        message
      });
    }
  );
  if (serverResult.targetSource || serverResult.targetConfidence) {
    notices.push({
      key: "target-source",
      severity: serverResult.targetConfidence === "low" ? "medium" : "info",
      message: `Target source: ${serverResult.targetSource || "stage default"}; confidence: ${serverResult.targetConfidence || "unknown"}.`
    });
  }
  return notices;
}
