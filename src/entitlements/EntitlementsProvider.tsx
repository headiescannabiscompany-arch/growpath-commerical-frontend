import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  UserMeResponse,
  Mode,
  Plan,
  FacilityRole,
  CapabilityKey,
  LimitKey
} from "./types";
import { client } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type EntitlementsState = {
  ready: boolean;
  loading: boolean;
  error?: string;
  userId?: string;
  mode: Mode;
  plan: Plan;
  facilityId?: string;
  facilityRole?: FacilityRole;
  capabilities: Record<string, boolean>;
  limits: Record<string, number>;
  can: (cap: CapabilityKey | CapabilityKey[]) => boolean;
  limit: (key: LimitKey, fallback?: number) => number;
  refresh: () => Promise<void>;
};

const DEFAULT_CAPS: Record<string, boolean> = {};
const DEFAULT_LIMITS: Record<string, number> = {};

const EntitlementsContext = createContext<EntitlementsState | null>(null);

function normalizeRole(role?: string): FacilityRole | undefined {
  if (!role) return undefined;
  const r = role.toUpperCase().trim();
  if (r === "OWNER" || r === "MANAGER" || r === "TECH" || r === "VIEWER")
    return r as FacilityRole;
  return undefined;
}

function pickFromAuth(auth: any): Partial<UserMeResponse> | null {
  if (!auth) return null;
  const plan = auth.plan ?? auth.session?.plan;
  const mode = auth.mode ?? auth.session?.mode;
  const facilityId = auth.facilityId ?? auth.session?.facilityId;
  const facilityRole = auth.facilityRole ?? auth.session?.facilityRole;
  const capabilities =
    auth.capabilities ?? auth.entitlements?.capabilities ?? auth.session?.capabilities;
  const limits = auth.limits ?? auth.entitlements?.limits ?? auth.session?.limits;
  const userId = auth.user?.id ?? auth.userId ?? auth.session?.userId;
  if (!plan || !mode) return null;
  return {
    user: userId
      ? { id: String(userId), email: auth.user?.email ?? auth.email ?? "" }
      : undefined,
    session: { plan, mode, facilityId, facilityRole },
    entitlements: {
      capabilities: capabilities ?? {},
      limits: limits ?? {}
    }
  } as Partial<UserMeResponse>;
}

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [plan, setPlan] = useState<Plan>("free");
  const [mode, setMode] = useState<Mode>("personal");
  const [facilityId, setFacilityId] = useState<string | undefined>(undefined);
  const [facilityRole, setFacilityRole] = useState<FacilityRole | undefined>(undefined);
  const [capabilities, setCapabilities] = useState<Record<string, boolean>>({
    ...DEFAULT_CAPS
  });
  const [limits, setLimits] = useState<Record<string, number>>({ ...DEFAULT_LIMITS });
  const lastHydrateSource = useRef<"auth" | "me" | null>(null);

  const hydrateFromMe = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await client.get<UserMeResponse>("/api/user/me");
      const data = res.data;
      setUserId(data.user?.id);
      setPlan(data.session.plan);
      setMode(data.session.mode);
      setFacilityId(data.session.facilityId);
      setFacilityRole(normalizeRole(String(data.session.facilityRole)) ?? undefined);
      setCapabilities(data.entitlements?.capabilities ?? {});
      setLimits(data.entitlements?.limits ?? {});
      lastHydrateSource.current = "me";
      setReady(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load entitlements");
    } finally {
      setLoading(false);
    }
  };

  const hydrateFromAuthIfPossible = () => {
    const picked = pickFromAuth(auth);
    if (!picked?.session?.plan || !picked?.session?.mode) return false;
    setUserId(picked.user?.id);
    setPlan(picked.session.plan as Plan);
    setMode(picked.session.mode as Mode);
    setFacilityId(picked.session.facilityId);
    setFacilityRole(normalizeRole(String(picked.session.facilityRole)) ?? undefined);
    setCapabilities(picked.entitlements?.capabilities ?? {});
    setLimits(picked.entitlements?.limits ?? {});
    lastHydrateSource.current = "auth";
    setReady(true);
    return true;
  };

  useEffect(() => {
    // Use isHydrating and isAuthed from AuthContext
    if (auth?.isHydrating) return;
    if (!auth?.user) {
      setReady(true);
      setLoading(false);
      setError(undefined);
      setUserId(undefined);
      setPlan("free");
      setMode("personal");
      setFacilityId(undefined);
      setFacilityRole(undefined);
      setCapabilities({});
      setLimits({});
      lastHydrateSource.current = null;
      return;
    }
    const ok = hydrateFromAuthIfPossible();
    if (!ok) {
      hydrateFromMe();
    }
  }, [auth?.isHydrating, auth?.user]);

  const refresh = async () => {
    if (!!auth?.user) {
      await hydrateFromMe();
    }
  };

  const can = (cap: CapabilityKey | CapabilityKey[]) => {
    const caps = capabilities ?? {};
    if (Array.isArray(cap)) return cap.every((k) => !!caps[k]);
    return !!caps[cap];
  };

  const limit = (key: LimitKey, fallback = 0) => {
    const v = limits?.[key];
    return typeof v === "number" ? v : fallback;
  };

  const value = useMemo<EntitlementsState>(
    () => ({
      ready,
      loading,
      error,
      userId,
      mode,
      plan,
      facilityId,
      facilityRole,
      capabilities,
      limits,
      can,
      limit,
      refresh
    }),
    [
      ready,
      loading,
      error,
      userId,
      mode,
      plan,
      facilityId,
      facilityRole,
      capabilities,
      limits
    ]
  );

  return (
    <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
  );
}

export function useEntitlementsContext() {
  const ctx = useContext(EntitlementsContext);
  if (!ctx)
    throw new Error("useEntitlementsContext must be used within EntitlementsProvider");
  return ctx;
}
