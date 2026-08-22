const ACTIVE_ACCESS_STATUSES = new Set(["active", "trial", "trialing"]);
const TRIAL_STATUSES = new Set(["trial", "trialing"]);
const IAP_SOURCES = new Set([
  "android",
  "app_store",
  "apple",
  "google_play",
  "iap",
  "ios",
  "play_store"
]);
const ADMIN_SOURCES = new Set(["admin", "complimentary", "manual"]);

type SubscriptionRecord = Record<string, any> | null | undefined;

export type SubscriptionSafetyContext = {
  effectivePlan?: unknown;
  hasPaidCapability?: boolean;
  loaded?: boolean;
};

export type SubscriptionSafetyState = {
  active: boolean;
  canCancel: boolean;
  canOpenCheckout: boolean;
  cancelScheduled: boolean;
  loaded: boolean;
  managementUrl: string | null;
  message: string;
  paidThrough: string | null;
  plan: string;
  source: "admin" | "gift" | "iap" | "stripe" | "trial" | "unknown";
  status: string;
};

function recordFrom(value: SubscriptionRecord): Record<string, any> {
  if (!value || typeof value !== "object") return {};
  if (value.data && typeof value.data === "object" && !Array.isArray(value.data)) {
    return { ...value, ...value.data };
  }
  if (
    value.subscription &&
    typeof value.subscription === "object" &&
    !Array.isArray(value.subscription)
  ) {
    return { ...value, ...value.subscription };
  }
  return value;
}

function normalized(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function paidPlan(value: unknown) {
  const plan = normalized(value);
  return Boolean(plan && !["free", "none", "unknown"].includes(plan));
}

function validManagementUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function sourceKind(record: Record<string, any>, trialing: boolean) {
  const source = normalized(
    record.source || record.subscriptionSource || record.billingSource || record.provider
  );
  const billingOwner = normalized(record.billingOwner);
  if (source === "gift" || billingOwner === "purchaser") return "gift" as const;
  if (IAP_SOURCES.has(source)) return "iap" as const;
  if (ADMIN_SOURCES.has(source)) return "admin" as const;
  if (source === "stripe") return "stripe" as const;
  if (trialing) return "trial" as const;
  return "unknown" as const;
}

function accessMessage(
  source: SubscriptionSafetyState["source"],
  active: boolean,
  cancelScheduled: boolean,
  paidThrough: string | null
) {
  if (!active) return "No active paid access is confirmed. Checkout remains available.";
  if (cancelScheduled) {
    return paidThrough
      ? `Renewal is canceled. Paid access remains available through ${paidThrough}.`
      : "Renewal is canceled. Paid access remains available through the confirmed billing period.";
  }
  switch (source) {
    case "gift":
      return "This prepaid gift does not renew. Billing is managed by the purchaser, so there is no subscription to cancel here.";
    case "iap":
      return "This access is managed by the app-store provider. Use its management link when one is available; GrowPath cannot cancel it here.";
    case "admin":
      return "This access was granted administratively and has no customer subscription to cancel.";
    case "trial":
      return "Trial access is active. Review its provider terms or paid-through date; GrowPath does not expose cancellation without a confirmed cancellable Stripe subscription.";
    case "stripe":
      return "Stripe-managed paid access is active. Use the available management action for this subscription.";
    default:
      return "Paid access is active, but its billing source is not confirmed as cancellable Stripe access. No cancellation action is available here.";
  }
}

export function resolveSubscriptionSafety(
  value: SubscriptionRecord,
  context: SubscriptionSafetyContext = {}
): SubscriptionSafetyState {
  const record = recordFrom(value);
  const status = normalized(record.subscriptionStatus || record.status) || "unknown";
  const plan = normalized(record.plan || record.tier || context.effectivePlan) || "free";
  const cancelScheduled = record.cancelAtPeriodEnd === true;
  const trialing = TRIAL_STATUSES.has(status);
  const explicitAccess =
    ACTIVE_ACCESS_STATUSES.has(status) ||
    record.isPro === true ||
    record.hasActiveSubscription === true;
  const capabilityAccess =
    context.hasPaidCapability === true || paidPlan(context.effectivePlan);
  const active = cancelScheduled || explicitAccess || capabilityAccess;
  const source = sourceKind(record, trialing);
  const paidThroughValue =
    record.currentPeriodEnd || record.expiry || record.giftEntitlementEndsAt || null;
  const paidThrough =
    typeof paidThroughValue === "string" && paidThroughValue.trim()
      ? paidThroughValue.trim()
      : null;
  const managementUrl = validManagementUrl(
    record.managementUrl || record.billingPortalUrl || record.portalUrl
  );
  const canCancel = Boolean(
    active &&
    !cancelScheduled &&
    source === "stripe" &&
    record.canManageBilling === true &&
    record.canCancelSubscription === true
  );
  const loaded = context.loaded !== false;

  return {
    active,
    canCancel,
    canOpenCheckout: loaded && !active,
    cancelScheduled,
    loaded,
    managementUrl,
    message: loaded
      ? accessMessage(source, active, cancelScheduled, paidThrough)
      : "Current subscription access could not be confirmed. Refresh status before starting another checkout.",
    paidThrough,
    plan,
    source,
    status
  };
}

export function formatSubscriptionDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
}
