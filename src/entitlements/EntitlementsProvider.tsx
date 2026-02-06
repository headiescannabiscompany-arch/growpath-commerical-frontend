import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { useAuth } from "../auth/AuthContext";
import { useSession } from "../session";
import { apiMe } from "../api/me";
import { setAuthToken } from "../api/client";
import { setToken as persistToken } from "../auth/tokenStore";

type Plan = "free" | "pro" | "creator_plus" | "commercial" | "facility";
type Mode = "personal" | "commercial" | "facility";

type Capabilities = Record<string, boolean>;
type Limits = Record<string, number>;

type EntitlementsContextValue = {
  ready: boolean;
  loading: boolean;
  userId: string | null;
  plan: Plan;
  mode: Mode;
  facilityId?: string;
  facilityRole?: string;
  capabilities: Capabilities;
  limits: Limits;
  refresh: () => Promise<void>;
};
export const EntitlementsContext = createContext<EntitlementsContextValue | null>(null);

const DEFAULT_CAPABILITIES: Capabilities = {};
const DEFAULT_LIMITS: Limits = { maxPlants: 1, maxGrows: 1 };

function normalizePlan(p: any): Plan {
  if (p === "pro" || p === "creator_plus" || p === "commercial" || p === "facility")
    return p;
  return "free";
}

function normalizeMode(m: any): Mode {
  if (m === "commercial" || m === "facility") return m;
  return "personal";
}

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const session = useSession();

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan>("free");
  const [capabilities, setCapabilities] = useState<Capabilities>({
    ...DEFAULT_CAPABILITIES
  });
  const [limits, setLimits] = useState<Limits>({ ...DEFAULT_LIMITS });

  const userId = auth.user?.id ?? null;

  const applyServerSessionToClient = useCallback(
    (serverSession: any) => {
      try {
        if (serverSession?.mode) session.setMode(normalizeMode(serverSession.mode));
        if ("facilityId" in (serverSession ?? {})) {
          session.setSelectedFacilityId(serverSession.facilityId ?? null);
        }
        if ("facilityRole" in (serverSession ?? {})) {
          session.setFacilityRole(serverSession.facilityRole ?? null);
        }
        if ("facilityFeaturesEnabled" in (serverSession ?? {})) {
          session.setFacilityFeaturesEnabled(!!serverSession.facilityFeaturesEnabled);
        }
      } catch {
        // ignore
      }
    },
    [session]
  );

  const hydrateFromMe = useCallback(async () => {
    if (!auth.token) {
      setAuthToken(null);
      setPlan("free");
      setCapabilities({ ...DEFAULT_CAPABILITIES });
      setLimits({ ...DEFAULT_LIMITS });
      setReady(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Set token on client before calling apiMe
      setAuthToken(auth.token);

      const resp = await apiMe();
      const serverPlan = normalizePlan(resp?.session?.plan);
      setPlan(serverPlan);
      applyServerSessionToClient(resp?.session);
      const caps = resp?.entitlements?.capabilities ?? DEFAULT_CAPABILITIES;
      const lims = resp?.entitlements?.limits ?? DEFAULT_LIMITS;
      setCapabilities({ ...caps });
      setLimits({ ...lims });
      setReady(true); // Only mark ready on success
    } catch (e: any) {
      console.error("Failed to hydrate entitlements:", e);
      // If 401, token is invalid - clear it
      if (e?.status === 401) {
        console.log("[ENTITLEMENTS] Got 401 from /api/me, clearing token permanently");
        setAuthToken(null);
        // CRITICAL: persist null to storage to prevent token reappearance
        await persistToken(null);
      }
      setPlan("free");
      setCapabilities({ ...DEFAULT_CAPABILITIES });
      setLimits({ ...DEFAULT_LIMITS });
      setReady(true); // Mark ready even on failure so UI isn't stuck loading
    } finally {
      setLoading(false);
    }
  }, [auth.token, applyServerSessionToClient]);

  useEffect(() => {
    if (auth.isHydrating) return;
    if (!auth.user || !auth.token) {
      setAuthToken(null);
      session.resetSession().catch(() => {});
      setPlan("free");
      setCapabilities({ ...DEFAULT_CAPABILITIES });
      setLimits({ ...DEFAULT_LIMITS });
      setReady(true);
      setLoading(false);
      return;
    }
    setReady(false);
    hydrateFromMe();
  }, [auth.isHydrating, auth.user, auth.token, hydrateFromMe, session]);

  const refresh = useCallback(async () => {
    setReady(false);
    await hydrateFromMe();
  }, [hydrateFromMe]);

  const value = useMemo<EntitlementsContextValue>(
    () => ({
      ready,
      loading,
      userId,
      plan,
      mode: session.mode,
      facilityId: session.selectedFacilityId ?? undefined,
      facilityRole: session.facilityRole ?? undefined,
      capabilities,
      limits,
      refresh
    }),
    [
      ready,
      loading,
      userId,
      plan,
      session.mode,
      session.selectedFacilityId,
      session.facilityRole,
      capabilities,
      limits,
      refresh
    ]
  );

  return (
    <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  const ctx = useContext(EntitlementsContext);
  if (!ctx) {
    throw new Error("useEntitlements must be used within an EntitlementsProvider");
  }
  return ctx;
}
