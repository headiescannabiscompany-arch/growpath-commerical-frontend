import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useAuth } from "../auth/AuthContext";
import { apiMe } from "../api/me";

type EntitlementsMode = "personal" | "commercial" | "facility";

type EntitlementsState = {
  ready: boolean;
  mode: EntitlementsMode;
  plan: string | null;
  capabilities: Record<string, any>;
  limits: Record<string, any>;
};

const DEFAULT_STATE: EntitlementsState = {
  ready: false,
  mode: "personal",
  plan: null,
  capabilities: {},
  limits: {}
};

const EntitlementsContext = createContext<EntitlementsState>(DEFAULT_STATE);

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
  prev: EntitlementsState,
  ctx: any,
  userPlan: any
): EntitlementsState {
  const mode = pickMode(ctx?.mode);
  const plan = userPlan ?? ctx?.plan ?? prev.plan ?? "free";

  return {
    ready: true,
    mode,
    plan,
    capabilities:
      ctx?.capabilities && typeof ctx.capabilities === "object" ? ctx.capabilities : {},
    limits: ctx?.limits && typeof ctx.limits === "object" ? ctx.limits : {}
  };
}

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const { token, isHydrating, logout } = useAuth();

  const [state, setState] = useState<EntitlementsState>(DEFAULT_STATE);

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
    let mounted = true;

    // While auth is hydrating, keep entitlements not-ready (prevents early fetches)
    if (isHydrating) {
      setState((s) => (s.ready ? DEFAULT_STATE : s));
      return () => {
        mounted = false;
      };
    }

    // No token => personal defaults, ready=true (so app can route deterministically)
    if (!token) {
      setState({
        ready: true,
        mode: "personal",
        plan: "free",
        capabilities: {},
        limits: {}
      });
      lastAppliedRef.current = "NO_TOKEN";
      lastFetchedTokenRef.current = null;
      return () => {
        mounted = false;
      };
    }

    // Only fetch /api/me if we haven't already fetched for this token
    if (lastFetchedTokenRef.current === token) {
      return () => {
        mounted = false;
      };
    }
    lastFetchedTokenRef.current = token;

    (async () => {
      try {
        // Contract: apiMe returns { user, ctx }
        // Use invalidateOn401: false to prevent token thrashing during hydration
        const resp = await apiMe({ silent: true });

        const ctx = resp?.ctx ?? null;
        const userPlan = resp?.user?.plan ?? null;

        const fingerprint = safeStringify({ ctx, userPlan });

        if (!mounted) return;

        // Only apply if changed
        if (fingerprint !== lastAppliedRef.current) {
          lastAppliedRef.current = fingerprint;
          setState((prev) => applyServerCtx(prev, ctx, userPlan));
        } else {
          // Ensure ready is true even if ctx unchanged
          setState((prev) => (prev.ready ? prev : { ...prev, ready: true }));
        }
      } catch (e: any) {
        if (!mounted) return;

        // Global 401: token invalid => force logout (hard logout lives in AuthContext)
        if (e?.status === 401 || e?.code === "UNAUTHORIZED") {
          await logout();
          // After logout, set safe defaults (ready true so routing is stable)
          setState({
            ready: true,
            mode: "personal",
            plan: "free",
            capabilities: {},
            limits: {}
          });
          lastAppliedRef.current = "UNAUTHORIZED";
          return;
        }

        // Non-401 failures: do NOT brick the app.
        // Keep token as-is; set ready so UI can render (FacilityProvider will gate by mode/plan anyway)
        setState((prev) => ({
          ...prev,
          ready: true
        }));
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token, isHydrating]);

  const value = useMemo(() => state, [state]);

  return (
    <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  return useContext(EntitlementsContext);
}
