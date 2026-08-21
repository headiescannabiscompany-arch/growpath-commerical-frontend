import { apiRequest } from "./apiRequest";

export function suggestLogInsights(payload: {
  growId: string;
  title: string;
  notes: string;
  logType: string;
  workspaceType?: "personal" | "commercial";
}) {
  return apiRequest("/api/diagnose/analyze", {
    method: "POST",
    body: { ...payload, mode: "log_auto_tag" }
  });
}
