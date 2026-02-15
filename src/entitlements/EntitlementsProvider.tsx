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

// Pure "apply" function (no side effects other than returning next state)
function applyServerCtx(
  prev: Omit<EntitlementsState, "can">,
  ctx: any,
  userPlan: any
): Omit<EntitlementsState, "can"> {
  const mode = pickMode(ctx?.mode);
  const plan = userPlan ?? ctx?.plan ?? prev.plan ?? "free";
  const facilityId = ctx?.facilityId ?? null;
  const facilityRole = ctx?.facilityRole ?? null;

  return {
    ready: true,
    mode,
    plan,
    facilityId,
    selectedFacilityId: facilityId, // Alias
    facilityRole,
    capabilities:
      ctx?.capabilities && typeof ctx.capabilities === "object" ? ctx.capabilities : {},
    limits: ctx?.limits && typeof ctx.limits === "object" ? ctx.limits : {}
  };
}

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const { token, isHydrating, logout } = auth;

  const [state, setState] = useState<Omit<EntitlementsState, "can">>(DEFAULT_STATE);

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
      setState((prev) => applyServerCtx(prev, ctx, userPlan));
    } else {
      // Ensure ready is true even if ctx unchanged
      setState((prev) => (prev.ready ? prev : { ...prev, ready: true }));
    }

    return () => {};
  }, [isHydrating, token, auth.ctx, auth.user]);
  const can = useMemo(() => {
    const fn = (capability: string | string[]) => {
      if (!state.ready) return false;
      if (Array.isArray(capability)) {
        return capability.every((cap) => state.capabilities[cap] === true);
      }
      return state.capabilities[capability] === true;
    };
    return Object.assign(fn, state.capabilities);
  }, [state.ready, state.capabilities]);

  const refresh = useCallback((plan?: string, capabilities?: Record<string, any>) => {
    setState((s) => ({
      ...s,
      ready: true,
      plan: plan ?? s.plan,
      capabilities: capabilities ?? s.capabilities
    }));
  }, []);

  const value = useMemo(() => ({ ...state, can, refresh }), [state, can, refresh]);

  return (
    <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  return useContext(EntitlementsContext);
}
