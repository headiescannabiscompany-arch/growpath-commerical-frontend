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

export function hasActiveSubscriptionStatus(status: any) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  return normalized === "free" || ACTIVE_SUBSCRIPTION_STATUSES.has(normalized);
}

export function getEffectivePlan(plan: string | null, subscriptionStatus: any) {
  const normalizedPlan = String(plan || "free")
    .trim()
    .toLowerCase();
  if (normalizedPlan === "free") return "free";
  return hasActiveSubscriptionStatus(subscriptionStatus) ? normalizedPlan : "free";
}

function applyFacilityRoleCapabilities(
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

  if (
    facilityRole === "OWNER" ||
    facilityRole === "MANAGER" ||
    facilityRole === "STAFF"
  ) {
    normalized[CAPABILITY_KEYS.TASKS_WRITE] = true;
    normalized[CAPABILITY_KEYS.GROWS_WRITE] = true;
    normalized[CAPABILITY_KEYS.PLANTS_WRITE] = true;
    normalized[CAPABILITY_KEYS.GROWLOGS_WRITE] = true;
    normalized[CAPABILITY_KEYS.INVENTORY_WRITE] = true;
    normalized[CAPABILITY_KEYS.SOP_RUNS_WRITE] = true;
  }

  if (facilityRole === "OWNER" || facilityRole === "MANAGER") {
    normalized[CAPABILITY_KEYS.TEAM_INVITE] = true;
    normalized[CAPABILITY_KEYS.TEAM_UPDATE_ROLE] = true;
    normalized[CAPABILITY_KEYS.TEAM_REMOVE] = true;
    normalized[CAPABILITY_KEYS.COMPLIANCE_WRITE] = true;
    normalized[CAPABILITY_KEYS.EXPORT_COMPLIANCE] = true;
    normalized[CAPABILITY_KEYS.FACILITY_SETTINGS_EDIT] = true;
  }
}

function applyUniversalCapabilities(normalized: Record<string, boolean>) {
  normalized[CAPABILITY_KEYS.COURSES_VIEW] = true;
  normalized[CAPABILITY_KEYS.SEE_PAID_COURSES] = true;
  normalized[CAPABILITY_KEYS.FORUM_VIEW] = true;
  normalized[CAPABILITY_KEYS.FORUM_POST] = true;
}

function applyPlanCapabilities(
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
  normalized[CAPABILITY_KEYS.LOGS_PERSONAL_VIEW] = true;
  normalized[CAPABILITY_KEYS.PLANTS_PERSONAL_VIEW] = true;
  normalized[CAPABILITY_KEYS.DIAGNOSE_BASIC] = true;
  normalized[CAPABILITY_KEYS.TOOLS_VPD] = true;
  normalized[CAPABILITY_KEYS.TOOL_NPK] = true;
  normalized[CAPABILITY_KEYS.TOOL_HARVEST_ESTIMATOR] = true;

  if (isPaidPersonal || isCommercial || isFacility) {
    normalized[CAPABILITY_KEYS.GROWS_PERSONAL_WRITE] = true;
    normalized[CAPABILITY_KEYS.LOGS_PERSONAL_WRITE] = true;
    normalized[CAPABILITY_KEYS.PLANTS_PERSONAL_WRITE] = true;
    normalized[CAPABILITY_KEYS.AI_ASSISTANT] = true;
    normalized[CAPABILITY_KEYS.ALERTS_VIEW] = true;
    normalized[CAPABILITY_KEYS.ALERTS_ACK] = true;
    normalized[CAPABILITY_KEYS.DASHBOARD_ANALYTICS] = true;
    normalized[CAPABILITY_KEYS.DASHBOARD_EXPORT] = true;
    normalized[CAPABILITY_KEYS.DIAGNOSE_AI] = true;
    normalized[CAPABILITY_KEYS.DIAGNOSE_ADVANCED] = true;
    normalized[CAPABILITY_KEYS.DIAGNOSE_EXPORT] = true;
    normalized[CAPABILITY_KEYS.TOOL_TIMELINE_PLANNER] = true;
    normalized[CAPABILITY_KEYS.TOOL_PDF_EXPORT] = true;
    normalized[CAPABILITY_KEYS.TOOL_PHENO_MATRIX] = true;
    normalized[CAPABILITY_KEYS.FEEDING_SCHEDULE] = true;
    normalized[CAPABILITY_KEYS.TASK_REMINDERS] = true;
  }

  if (isCommercial || isFacility) {
    normalized[CAPABILITY_KEYS.COMMERCIAL_HOME] = true;
    normalized[CAPABILITY_KEYS.COMMERCIAL_INVENTORY_VIEW] = true;
    normalized[CAPABILITY_KEYS.COMMERCIAL_TASKS_VIEW] = true;
    normalized[CAPABILITY_KEYS.COMMERCIAL_FEED_VIEW] = true;
    normalized[CAPABILITY_KEYS.COMMERCIAL_ALERTS_VIEW] = true;
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

export function shouldApplyFacilityRoleCapabilities(mode: EntitlementsMode) {
  return mode === "facility";
}

// Pure "apply" function (no side effects other than returning next state)
function applyServerCtx(
  prev: Omit<EntitlementsState, "can">,
  ctx: any,
  userPlan: any,
  preferredMode: PreferredMode | null
): Omit<EntitlementsState, "can"> {
  const requestedPlan = userPlan ?? ctx?.plan ?? prev.plan ?? "free";
  const subscriptionStatus = ctx?.subscriptionStatus ?? ctx?.user?.subscriptionStatus;
  const plan = getEffectivePlan(requestedPlan, subscriptionStatus);
  const resolvedMode = resolveEntitlementsMode(ctx, preferredMode);
  const mode = resolveWorkspaceMode(requestedPlan, resolvedMode);
  const facilityId = ctx?.facilityId ?? null;
  const facilityRole = normalizeFacilityRole(ctx?.facilityRole);

  const normalized: Record<string, boolean> = {};
  const unknownKeys: string[] = [];
  if (ctx?.capabilities) {
    if (Array.isArray(ctx.capabilities)) {
      for (const raw of ctx.capabilities) {
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
    } else if (typeof ctx.capabilities === "object") {
      for (const [raw, v] of Object.entries(ctx.capabilities)) {
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
  if (shouldApplyFacilityRoleCapabilities(mode)) {
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
    limits: ctx?.limits && typeof ctx.limits === "object" ? ctx.limits : {}
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
        capabilities: {},
        limits: {}
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
    const userPlan = auth.user?.plan ?? null;

    const fingerprint = safeStringify({ ctx, userPlan });

    // Only apply if changed
    if (fingerprint !== lastAppliedRef.current) {
      lastAppliedRef.current = fingerprint;
      setState((prev) => applyServerCtx(prev, ctx, userPlan, preferredMode));
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
