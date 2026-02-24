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
import { KNOWN_CAPS } from "./capabilityKeys";
import { normalizeCapabilityKey, normalizeFacilityRole } from "./normalize";
import {
  getPreferredMode as loadPreferredMode,
  setPreferredMode as persistPreferredMode,
  type PreferredMode
} from "../auth/modeStore";

type EntitlementsMode = "personal" | "commercial" | "facility";

export type EntitlementsState = {
  ready: boolean;
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

function hasFacilityAccess(ctx: any, plan: any) {
  return !!(ctx?.facilityId || ctx?.facilityRole || plan === "facility");
}

function hasCommercialAccess(ctx: any, plan: any) {
  return plan === "commercial" || plan === "facility" || ctx?.mode === "commercial";
}

function resolveMode(
  ctx: any,
  plan: any,
  preferredMode: PreferredMode | null
): EntitlementsMode {
  const baseMode = pickMode(ctx?.mode);
  const canFacility = hasFacilityAccess(ctx, plan);
  const canCommercial = hasCommercialAccess(ctx, plan);

  if (preferredMode === "facility" && canFacility) return "facility";
  if (preferredMode === "commercial" && canCommercial) return "commercial";
  if (preferredMode === "personal") return "personal";

  if (baseMode === "facility" && !canFacility && canCommercial) return "commercial";
  if (baseMode === "commercial" && !canCommercial && canFacility) return "facility";
  if (!canFacility && !canCommercial) return "personal";

  return baseMode;
}

// Pure "apply" function (no side effects other than returning next state)
function applyServerCtx(
  prev: Omit<EntitlementsState, "can">,
  ctx: any,
  userPlan: any,
  preferredMode: PreferredMode | null
): Omit<EntitlementsState, "can"> {
  const plan = userPlan ?? ctx?.plan ?? prev.plan ?? "free";
  const mode = resolveMode(ctx, plan, preferredMode);
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
        if (!KNOWN_CAPS.has(key)) {
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
        if (!KNOWN_CAPS.has(key)) {
          unknownKeys.push(String(raw));
          continue;
        }
        normalized[key] = normalized[key] || Boolean(v);
      }
    }
  }
  warnUnknownCapsOnce(unknownKeys);

  return {
    ready: true,
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
  const { token, isHydrating, logout } = auth;

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
      setState((prev) => (prev.ready ? prev : { ...prev, ready: true }));
    }

    return () => {};
  }, [isHydrating, token, auth.ctx, auth.user, preferredMode]);

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
          if (!KNOWN_CAPS.has(key)) {
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
          if (!KNOWN_CAPS.has(key)) {
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
