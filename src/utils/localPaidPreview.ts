const PAID_PREVIEW_PLANS = new Set(["pro", "personal", "premium"]);

function localWindowLocation() {
  if (typeof window === "undefined" || !window.location) {
    return { hostname: "", search: "" };
  }
  return {
    hostname: window.location.hostname || "",
    search: window.location.search || ""
  };
}

export function hasLocalPaidPreviewOverride(devPlanParam?: string | null) {
  const { hostname, search } = localWindowLocation();
  const params = new URLSearchParams(search);
  const plan = String(params.get("devPlan") || devPlanParam || "").toLowerCase();
  const paid = String(params.get("paid") || "").toLowerCase();
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "";

  return isLocal && (paid === "1" || paid === "true" || PAID_PREVIEW_PLANS.has(plan));
}

export function localPaidPreviewPlan<T extends string | null | undefined>(
  plan: T,
  devPlanParam?: string | null
) {
  return hasLocalPaidPreviewOverride(devPlanParam) ? "pro" : plan;
}
