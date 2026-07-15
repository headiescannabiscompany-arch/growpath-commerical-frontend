import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useAuth } from "../auth/AuthContext";
import { buildCan } from "./can";
import { CAPABILITY_KEYS, KNOWN_CAPS } from "./capabilityKeys";
import { normalizeCapabilityKey, normalizeFacilityRole } from "./normalize";
import {
  getPreferredMode as loadPreferredMode,
  setPreferredMode as persistPreferredMode,
  type PreferredMode
} from "../auth/modeStore";

type EntitlementsMode = "personal" | "commercial" | "facility";
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trial", "trialing"]);
const DEV_ENTITLEMENT_PLANS = new Set(["pro", "commercial", "facility"]);

export type EntitlementsState = {
  ready: boolean;
  bootstrapError: string | null;
  mode: EntitlementsMode;
  plan: string | null;
  facilityId: string | null;
  selectedFacilityId: string | null; // Alias for facilityId (backward compatibility)
  facilityRole: string | null; // User's role in facility mode
  capabilities: Record<string, any>;
  limits: Record<string, any>;
  can: ((capability: string | string[]) => boolean) & Record<string, boolean>;
  refresh?: (plan?: string, capabilities?: Record<string, any>) => void;
  preferredMode?: PreferredMode | null;
  setPreferredMode?: (mode: PreferredMode | null) => void;
};

const DEFAULT_STATE: Omit<EntitlementsState, "can"> = {
  ready: false,
  bootstrapError: null,
  mode: "personal",
  plan: null,
  facilityId: null,
  selectedFacilityId: null,
  facilityRole: null,
  capabilities: {},
  limits: {}
};

const EntitlementsContext = createContext<EntitlementsState>({
  ...DEFAULT_STATE,
  can: Object.assign(((capability: string | string[]) => false) as any, {}),
  refresh: () => {}
});

let lastUnknownCapsDigest = "";

function warnUnknownCapsOnce(unknownKeys: string[]) {
  if (!__DEV__) return;
  if (!unknownKeys || unknownKeys.length === 0) return;

  const digest = unknownKeys.slice().sort().join("|");
  if (digest === lastUnknownCapsDigest) return;
  lastUnknownCapsDigest = digest;

  console.warn("[ENT] Unknown capability keys (not canonical):", unknownKeys);
}

function safeStringify(v: any) {
  try {
    return JSON.stringify(v ?? null);
  } catch {
    return String(v);
  }
}

function pickMode(ctxMode: any): EntitlementsMode {
  if (ctxMode === "commercial") return "commercial";
  if (ctxMode === "facility") return "facility";
  return "personal";
}

function ctxHasCapability(ctx: any, capability: string) {
  if (Array.isArray(ctx?.capabilities)) {
    return ctx.capabilities.some(
      (raw: unknown) => normalizeCapabilityKey(String(raw)) === capability
    );
  }
  if (ctx?.capabilities && typeof ctx.capabilities === "object") {
    return Object.entries(ctx.capabilities).some(
      ([raw, enabled]) => enabled && normalizeCapabilityKey(raw) === capability
    );
  }
  return false;
}

function hasFacilityAccess(ctx: any) {
  return !!(
    ctx?.facilityId ||
    ctx?.facilityRole ||
    ctxHasCapability(ctx, CAPABILITY_KEYS.FACILITY_ACCESS)
  );
}

function hasCommercialAccess(ctx: any) {
  return ctxHasCapability(ctx, CAPABILITY_KEYS.COMMERCIAL_HOME);
}

export function resolveDevEntitlementsPlan(rawPlan?: string | null, isDev = __DEV__) {
  if (!isDev) return null;
  const queryPlan =
    typeof window !== "undefined" && window.location
      ? new URLSearchParams(window.location.search).get("devPlan")
      : null;
  const paidPreview =
    typeof window !== "undefined" && window.location
      ? new URLSearchParams(window.location.search).get("paid")
      : null;
  const normalized = String(
    rawPlan ??
      queryPlan ??
      (paidPreview === "1" || paidPreview === "true" ? "pro" : null) ??
      process.env.EXPO_PUBLIC_DEV_ENTITLEMENTS_PLAN ??
      ""
  )
    .trim()
    .toLowerCase();
  return DEV_ENTITLEMENT_PLANS.has(normalized) ? normalized : null;
}

function withCapability(ctx: any, capability: string) {
  if (Array.isArray(ctx?.capabilities)) {
    return {
      ...ctx,
      capabilities: Array.from(new Set([...ctx.capabilities, capability]))
    };
  }
  return {
    ...ctx,
    capabilities: {
      ...(ctx?.capabilities && typeof ctx.capabilities === "object"
        ? ctx.capabilities
        : {}),
      [capability]: true
    }
  };
}

function applyDevEntitlementsOverride(ctx: any, devPlan: string | null) {
  if (!devPlan) return ctx ?? {};
  if (devPlan === "pro") {
    return {
      ...(ctx ?? {}),
      mode: "personal"
    };
  }

  const mode = devPlan === "facility" ? "facility" : "commercial";
  let next = withCapability({ ...(ctx ?? {}), mode }, CAPABILITY_KEYS.COMMERCIAL_HOME);
  if (devPlan === "facility") {
    next = withCapability(next, CAPABILITY_KEYS.FACILITY_ACCESS);
    next.facilityId = next.facilityId ?? "local-dev-facility";
    next.facilityRole = next.facilityRole ?? "OWNER";
  }
  return next;
}

export function hasActiveSubscriptionStatus(status: any) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  return ACTIVE_SUBSCRIPTION_STATUSES.has(normalized);
}

export function getEffectivePlan(plan: string | null, subscriptionStatus: any) {
  const normalizedPlan = String(plan || "free")
    .trim()
    .toLowerCase();
  if (normalizedPlan === "free") return "free";
  return hasActiveSubscriptionStatus(subscriptionStatus) ? normalizedPlan : "free";
}

export function applyFacilityRoleCapabilities(
  normalized: Record<string, boolean>,
  facilityRole: string | null
) {
  if (!facilityRole) return;

  normalized[CAPABILITY_KEYS.FACILITY_ACCESS] = true;
  normalized[CAPABILITY_KEYS.TASKS_READ] = true;
  normalized[CAPABILITY_KEYS.GROWS_READ] = true;
  normalized[CAPABILITY_KEYS.PLANTS_READ] = true;
  normalized[CAPABILITY_KEYS.GROWLOGS_READ] = true;
  normalized[CAPABILITY_KEYS.INVENTORY_READ] = true;
  normalized[CAPABILITY_KEYS.COMPLIANCE_READ] = true;
  normalized[CAPABILITY_KEYS.AUDIT_READ] = true;
  normalized[CAPABILITY_KEYS.SOP_RUNS_READ] = true;
  normalized[CAPABILITY_KEYS.TEAM_VIEW] = true;
  normalized[CAPABILITY_KEYS.ROOMS_EQUIPMENT_STAFF] = true;

  if (facilityRole === "OWNER" || facilityRole === "MANAGER") {
    normalized[CAPABILITY_KEYS.GROWS_WRITE] = true;
    normalized[CAPABILITY_KEYS.PLANTS_WRITE] = true;
    normalized[CAPABILITY_KEYS.INVENTORY_WRITE] = true;
    normalized[CAPABILITY_KEYS.SOP_RUNS_WRITE] = true;
  }

  if (
    facilityRole === "OWNER" ||
    facilityRole === "MANAGER" ||
    facilityRole === "STAFF"
  ) {
    normalized[CAPABILITY_KEYS.TASKS_WRITE] = true;
    normalized[CAPABILITY_KEYS.GROWLOGS_WRITE] = true;
  }

  if (facilityRole === "OWNER") {
    normalized[CAPABILITY_KEYS.TEAM_INVITE] = true;
    normalized[CAPABILITY_KEYS.TEAM_UPDATE_ROLE] = true;
    normalized[CAPABILITY_KEYS.TEAM_REMOVE] = true;
    normalized[CAPABILITY_KEYS.FACILITY_SETTINGS_EDIT] = true;
  }

  if (facilityRole === "OWNER" || facilityRole === "MANAGER") {
    normalized[CAPABILITY_KEYS.COMPLIANCE_WRITE] = true;
    normalized[CAPABILITY_KEYS.EXPORT_COMPLIANCE] = true;
  }
}

export function applyUniversalCapabilities(normalized: Record<string, boolean>) {
  normalized[CAPABILITY_KEYS.COURSES_VIEW] = true;
  normalized[CAPABILITY_KEYS.SEE_PAID_COURSES] = true;
  normalized[CAPABILITY_KEYS.COURSES_CREATE] = true;
  normalized[CAPABILITY_KEYS.COURSES_SELL_PAID] = true;
  normalized[CAPABILITY_KEYS.PUBLISH_COURSES] = true;
  normalized[CAPABILITY_KEYS.FORUM_VIEW] = true;
  normalized[CAPABILITY_KEYS.FORUM_POST] = true;
}

export function applyDefaultCourseLimits(
  limits: Record<string, any>,
  plan: string | null
): Record<string, any> {
  const next = { ...limits };
  const normalizedPlan = String(plan || "free")
    .trim()
    .toLowerCase();

  if (next.maxPaidCourses === undefined || next.maxPaidCourses === null) {
    if (normalizedPlan === "free") next.maxPaidCourses = 1;
    else if (normalizedPlan === "pro" || normalizedPlan === "personal") {
      next.maxPaidCourses = 5;
    }
  }

  if (next.maxLessonsPerCourse === undefined || next.maxLessonsPerCourse === null) {
    if (normalizedPlan === "free") next.maxLessonsPerCourse = 7;
    else if (normalizedPlan === "pro" || normalizedPlan === "personal") {
      next.maxLessonsPerCourse = 20;
    }
  }

  if (next.maxGrows === undefined || next.maxGrows === null) {
    if (normalizedPlan === "free") next.maxGrows = 1;
  }

  if (next.maxPlants === undefined || next.maxPlants === null) {
    if (normalizedPlan === "free") next.maxPlants = 1;
  }

  return next;
}

export function applyPlanCapabilities(
  normalized: Record<string, boolean>,
  plan: string | null,
  _mode: EntitlementsMode
) {
  const normalizedPlan = String(plan || "")
    .trim()
    .toLowerCase();
  const isPro = normalizedPlan === "pro";
  const isPaidPersonal =
    isPro || normalizedPlan === "personal" || normalizedPlan === "premium";
  const isCommercial = normalizedPlan === "commercial";
  const isFacility = normalizedPlan === "facility";

  normalized[CAPABILITY_KEYS.GROWS_PERSONAL_VIEW] = true;
  normalized[CAPABILITY_KEYS.GROWS_PERSONAL_WRITE] = true;
  normalized[CAPABILITY_KEYS.LOGS_PERSONAL_VIEW] = true;
  normalized[CAPABILITY_KEYS.LOGS_PERSONAL_WRITE] = true;
  normalized[CAPABILITY_KEYS.PLANTS_PERSONAL_VIEW] = true;
  normalized[CAPABILITY_KEYS.PLANTS_PERSONAL_WRITE] = true;
  normalized[CAPABILITY_KEYS.AI_ASSISTANT] = true;
  normalized[CAPABILITY_KEYS.DIAGNOSE_BASIC] = true;
  normalized[CAPABILITY_KEYS.DIAGNOSE_AI] = true;
  normalized[CAPABILITY_KEYS.TOOLS_VPD] = true;
  normalized[CAPABILITY_KEYS.FEEDING_SCHEDULE] = true;
  normalized[CAPABILITY_KEYS.TASK_REMINDERS] = true;
  normalized[CAPABILITY_KEYS.TOOL_TIMELINE_PLANNER] = true;

  if (isPaidPersonal || isCommercial || isFacility) {
    normalized[CAPABILITY_KEYS.ALERTS_VIEW] = true;
    normalized[CAPABILITY_KEYS.ALERTS_ACK] = true;
    normalized[CAPABILITY_KEYS.DASHBOARD_ANALYTICS] = true;
    normalized[CAPABILITY_KEYS.DASHBOARD_EXPORT] = true;
    normalized[CAPABILITY_KEYS.DIAGNOSE_ADVANCED] = true;
    normalized[CAPABILITY_KEYS.DIAGNOSE_EXPORT] = true;
    normalized[CAPABILITY_KEYS.COURSES_SELL_PAID] = true;
    normalized[CAPABILITY_KEYS.TOOL_NPK] = true;
    normalized[CAPABILITY_KEYS.TOOL_HARVEST_ESTIMATOR] = true;
    normalized[CAPABILITY_KEYS.TOOL_PDF_EXPORT] = true;
    normalized[CAPABILITY_KEYS.TOOL_PHENO_MATRIX] = true;
  }

  if (isCommercial || isFacility) {
    normalized[CAPABILITY_KEYS.COMMERCIAL_HOME] = true;
    normalized[CAPABILITY_KEYS.COMMERCIAL_INVENTORY_VIEW] = true;
    normalized[CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE] = true;
    normalized[CAPABILITY_KEYS.COMMERCIAL_TASKS_VIEW] = true;
    normalized[CAPABILITY_KEYS.COMMERCIAL_FEED_VIEW] = true;
    normalized[CAPABILITY_KEYS.COMMERCIAL_ALERTS_VIEW] = true;
    normalized[CAPABILITY_KEYS.STORE_FRONT_VIEW] = true;
  }
}

export function resolveEntitlementsMode(
  ctx: any,
  preferredMode: PreferredMode | null
): EntitlementsMode {
  const baseMode = pickMode(ctx?.mode);
  const canFacility = hasFacilityAccess(ctx);
  const canCommercial = hasCommercialAccess(ctx);

  if (preferredMode === "facility" && canFacility) return "facility";
  if (preferredMode === "commercial" && canCommercial) return "commercial";
  if (preferredMode === "personal") return "personal";

  if (baseMode === "facility" && !canFacility && canCommercial) return "commercial";
  if (baseMode === "commercial") return "commercial";
  if (!canFacility && !canCommercial) return "personal";

  return baseMode;
}

export function resolveWorkspaceMode(
  requestedPlan: any,
  resolvedMode: EntitlementsMode
): EntitlementsMode {
  const requestedPlanKey = String(requestedPlan || "free")
    .trim()
    .toLowerCase();

  if (requestedPlanKey === "facility" || resolvedMode === "facility") {
    return "facility";
  }
  if (requestedPlanKey === "commercial" || resolvedMode === "commercial") {
    return "commercial";
  }
  return "personal";
}

export function shouldApplyFacilityRoleCapabilities(
  mode: EntitlementsMode,
  _plan: string | null = null
) {
  // Facility permissions come from membership role, not the billing plan.
  // A free facility owner must still be able to administer their workspace.
  return mode === "facility";
}

export function resolveRequestedPlan(
  ctx: any,
  user: any,
  previousPlan: string | null = null
) {
  return ctx?.requestedPlan ?? ctx?.plan ?? user?.plan ?? previousPlan ?? "free";
}

// Pure "apply" function (no side effects other than returning next state)
function applyServerCtx(
  prev: Omit<EntitlementsState, "can">,
  ctx: any,
  user: any,
  preferredMode: PreferredMode | null
): Omit<EntitlementsState, "can"> {
  const devPlan = resolveDevEntitlementsPlan();
  const effectiveCtx = applyDevEntitlementsOverride(ctx, devPlan);
  const requestedPlan = devPlan ?? resolveRequestedPlan(effectiveCtx, user, prev.plan);
  const subscriptionStatus =
    effectiveCtx?.subscriptionStatus ??
    effectiveCtx?.user?.subscriptionStatus ??
    user?.subscriptionStatus;
  const plan = devPlan ?? getEffectivePlan(requestedPlan, subscriptionStatus);
  const resolvedMode = resolveEntitlementsMode(effectiveCtx, preferredMode);
  const mode = resolveWorkspaceMode(requestedPlan, resolvedMode);
  const facilityId = effectiveCtx?.facilityId ?? null;
  const facilityRole = normalizeFacilityRole(effectiveCtx?.facilityRole);

  const normalized: Record<string, boolean> = {};
  const unknownKeys: string[] = [];
  if (effectiveCtx?.capabilities) {
    if (Array.isArray(effectiveCtx.capabilities)) {
      for (const raw of effectiveCtx.capabilities) {
        const key = normalizeCapabilityKey(raw);
        if (!key) {
          unknownKeys.push(String(raw));
          continue;
        }
        if (!(KNOWN_CAPS as Set<string>).has(key)) {
          unknownKeys.push(String(raw));
          continue;
        }
        normalized[key] = true;
      }
    } else if (typeof effectiveCtx.capabilities === "object") {
      for (const [raw, v] of Object.entries(effectiveCtx.capabilities)) {
        const key = normalizeCapabilityKey(raw);
        if (!key) {
          unknownKeys.push(String(raw));
          continue;
        }
        if (!(KNOWN_CAPS as Set<string>).has(key)) {
          unknownKeys.push(String(raw));
          continue;
        }
        normalized[key] = normalized[key] || Boolean(v);
      }
    }
  }
  warnUnknownCapsOnce(unknownKeys);
  applyUniversalCapabilities(normalized);
  applyPlanCapabilities(normalized, plan, mode);
  if (shouldApplyFacilityRoleCapabilities(mode, plan)) {
    applyFacilityRoleCapabilities(normalized, facilityRole);
  }

  return {
    ready: true,
    bootstrapError: null,
    mode,
    plan,
    facilityId,
    selectedFacilityId: facilityId, // Alias
    facilityRole,
    capabilities: normalized,
    limits: applyDefaultCourseLimits(
      effectiveCtx?.limits && typeof effectiveCtx.limits === "object"
        ? effectiveCtx.limits
        : {},
      plan
    )
  };
}

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const { token, isHydrating, logout, meStatus, meError } = auth;

  const [state, setState] = useState<Omit<EntitlementsState, "can">>(DEFAULT_STATE);
  const [preferredMode, setPreferredModeState] = useState<PreferredMode | null>(null);

  // Guard: prevent re-applying the same server ctx over and over
  const lastAppliedRef = useRef<string>("");

  // Guard: prevent refetching /api/me for the same token
  const lastFetchedTokenRef = useRef<string | null>(null);

  // Stabilize logout reference to prevent effect re-runs from logout identity changes
  const logoutRef = useRef(logout);
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  useEffect(() => {
    // While auth is hydrating, keep entitlements not-ready (prevents early fetches)
    if (isHydrating) {
      setState((s) => (s.ready ? DEFAULT_STATE : s));
      return () => {};
    }

    // No token => personal defaults, ready=true (so app can route deterministically)
    if (!token) {
      setState({
        ready: true,
        bootstrapError: null,
        selectedFacilityId: null,
        facilityRole: null,
        mode: "personal",
        plan: "free",
        facilityId: null,
        capabilities: {
          [CAPABILITY_KEYS.COURSES_VIEW]: true,
          [CAPABILITY_KEYS.SEE_PAID_COURSES]: true,
          [CAPABILITY_KEYS.COURSES_CREATE]: true,
          [CAPABILITY_KEYS.COURSES_SELL_PAID]: true,
          [CAPABILITY_KEYS.PUBLISH_COURSES]: true,
          [CAPABILITY_KEYS.FORUM_VIEW]: true,
          [CAPABILITY_KEYS.FORUM_POST]: true
        },
        limits: applyDefaultCourseLimits({}, "free")
      });
      setPreferredModeState(null);
      lastAppliedRef.current = "NO_TOKEN";
      lastFetchedTokenRef.current = null;
      return () => {};
    }

    // Token exists but /api/me is not yet confirmed: keep bootstrap blocked.
    if (meStatus === "loading" || meStatus === "idle") {
      setState((s) => ({
        ...s,
        ready: false,
        bootstrapError: null
      }));
      return () => {};
    }

    if (meStatus === "error") {
      setState((s) => ({
        ...s,
        ready: false,
        bootstrapError: meError || "Failed to load /api/me."
      }));
      return () => {};
    }

    // Only apply if we haven't already applied for this token
    if (lastFetchedTokenRef.current === token) {
      return () => {};
    }
    lastFetchedTokenRef.current = token;

    // Read ctx and user from AuthContext (no duplicate fetch)
    const ctx = auth.ctx ?? null;
    const user = auth.user ?? null;

    const fingerprint = safeStringify({ ctx, user });

    // Only apply if changed
    if (fingerprint !== lastAppliedRef.current) {
      lastAppliedRef.current = fingerprint;
      setState((prev) => applyServerCtx(prev, ctx, user, preferredMode));
    } else {
      // Ensure ready is true even if ctx unchanged
      setState((prev) =>
        prev.ready ? prev : { ...prev, ready: true, bootstrapError: null }
      );
    }

    return () => {};
  }, [isHydrating, token, auth.ctx, auth.user, preferredMode, meStatus, meError]);

  useEffect(() => {
    let alive = true;
    if (!token) return () => {};
    (async () => {
      const pref = await loadPreferredMode();
      if (alive) setPreferredModeState(pref);
    })();
    return () => {
      alive = false;
    };
  }, [token]);
  const can = useMemo(() => {
    const fn = buildCan(state.capabilities);
    return Object.assign(
      (capability: string | string[]) => (state.ready ? fn(capability) : false),
      state.capabilities
    );
  }, [state.ready, state.capabilities]);

  const refresh = useCallback((plan?: string, capabilities?: Record<string, any>) => {
    let normalizedCaps: Record<string, any> | null = null;
    if (capabilities !== undefined) {
      const nextCaps: Record<string, boolean> = {};
      const unknownKeys: string[] = [];
      if (Array.isArray(capabilities)) {
        for (const raw of capabilities) {
          const key = normalizeCapabilityKey(raw);
          if (!key) {
            unknownKeys.push(String(raw));
            continue;
          }
          if (!(KNOWN_CAPS as Set<string>).has(key)) {
            unknownKeys.push(String(raw));
            continue;
          }
          nextCaps[key] = true;
        }
      } else if (capabilities && typeof capabilities === "object") {
        for (const [raw, v] of Object.entries(capabilities)) {
          const key = normalizeCapabilityKey(raw);
          if (!key) {
            unknownKeys.push(String(raw));
            continue;
          }
          if (!(KNOWN_CAPS as Set<string>).has(key)) {
            unknownKeys.push(String(raw));
            continue;
          }
          nextCaps[key] = nextCaps[key] || Boolean(v);
        }
      }
      warnUnknownCapsOnce(unknownKeys);
      normalizedCaps = nextCaps;
    }
    setState((s) => ({
      ...s,
      ready: true,
      bootstrapError: null,
      plan: plan ?? s.plan,
      capabilities: normalizedCaps ?? s.capabilities
    }));
  }, []);

  const setPreferredMode = useCallback(async (mode: PreferredMode | null) => {
    setPreferredModeState(mode);
    await persistPreferredMode(mode);
  }, []);

  const value = useMemo(
    () => ({ ...state, can, refresh, preferredMode, setPreferredMode }),
    [state, can, refresh, preferredMode, setPreferredMode]
  );

  return (
    <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  return useContext(EntitlementsContext);
}
