/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef
} from "react";
import { useGlobalSearchParams, usePathname } from "expo-router";
import { logEvent } from "../api/events";
import { usePushRegistration } from "../hooks/usePushRegistration";
import {
  login as apiLogin,
  signup as apiSignup,
  type AuthUser,
  type SignupBody,
  type SignupResponse
} from "../api/auth";
import { setToken as persistToken, getToken as readToken } from "./tokenStore";
import { setOnUnauthorized } from "../api/apiRequest";
import { apiMe } from "../api/me";

const LOCAL_COMMERCIAL_PREVIEW_TOKEN = "local-preview-commercial-token";
const LOCAL_COMMERCIAL_PREVIEW_EMAIL = "commercial-demo@growpathai.local";
const LOCAL_FACILITY_PREVIEW_TOKEN = "local-preview-facility-token";
const LOCAL_FACILITY_PREVIEW_EMAIL = "facility-demo@growpathai.local";
const LOCAL_FACILITY_PREVIEW_ID = "local-dev-facility";
const LOCAL_PERSONAL_PREVIEW_TOKEN = "local-preview-personal-token";
const LOCAL_PERSONAL_PREVIEW_EMAIL = "single-free-demo@growpathai.local";
const LOCAL_PERSONAL_PRO_PREVIEW_EMAIL = "single-pro-demo@growpathai.local";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  ctx: any | null;
  meStatus: "idle" | "loading" | "ready" | "error";
  meError: string | null;
  isHydrating: boolean;
  isAuthed: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (body: SignupBody) => Promise<SignupResponse>;
  logout: () => Promise<void>;
  retryMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function localWindowLocation() {
  if (typeof window === "undefined" || !window.location) {
    return { hostname: "", pathname: "", search: "" };
  }
  return {
    hostname: window.location.hostname || "",
    pathname: window.location.pathname || "",
    search: window.location.search || ""
  };
}

function isLocalPreviewHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "";
}

type LocalPreviewLocation = {
  hostname: string;
  pathname: string;
  search: string;
};

function isCommercialPreviewRoute(pathname: string) {
  return pathname === "/home/commercial" || pathname.startsWith("/home/commercial/");
}

function isFacilityPreviewRoute(pathname: string) {
  return pathname === "/home/facility" || pathname.startsWith("/home/facility/");
}

function isPersonalPreviewRoute(pathname: string) {
  return pathname === "/home/personal" || pathname.startsWith("/home/personal/");
}

export function resolveLocalCommercialPreviewSession(location?: LocalPreviewLocation) {
  const { hostname, pathname, search } = location ?? localWindowLocation();
  if (!isLocalPreviewHost(hostname)) return null;
  if (isFacilityPreviewRoute(pathname) || isPersonalPreviewRoute(pathname)) return null;

  const params = new URLSearchParams(search);
  const devPlan = String(params.get("devPlan") || "").toLowerCase();
  const commercialParam = String(params.get("commercial") || "").toLowerCase();
  const wantsCommercial =
    isCommercialPreviewRoute(pathname) ||
    devPlan === "commercial" ||
    commercialParam === "1" ||
    commercialParam === "true";

  if (!wantsCommercial) return null;

  const email =
    String(params.get("commercialEmail") || "")
      .trim()
      .toLowerCase() || LOCAL_COMMERCIAL_PREVIEW_EMAIL;
  const displayName = String(params.get("commercialName") || "Commercial Demo Brand");

  return {
    token: LOCAL_COMMERCIAL_PREVIEW_TOKEN,
    user: {
      id: "local-commercial-preview-user",
      email,
      displayName,
      role: "creator" as const,
      plan: "commercial",
      subscriptionStatus: "active",
      emailVerified: true,
      businessName: displayName,
      companyName: displayName,
      business: {
        name: displayName,
        contactEmail: email
      }
    },
    ctx: {
      mode: "commercial",
      plan: "commercial",
      requestedPlan: "commercial",
      subscriptionStatus: "active",
      capabilities: {
        COMMERCIAL_HOME: true,
        COMMERCIAL_INVENTORY_VIEW: true,
        COMMERCIAL_INVENTORY_WRITE: true,
        COMMERCIAL_FEED_VIEW: true,
        COMMERCIAL_ALERTS_VIEW: true,
        COMMERCIAL_TASKS_VIEW: true,
        STORE_FRONT_VIEW: true,
        STORE_FRONT_WRITE: true,
        COURSES_VIEW: true,
        COURSES_CREATE: true,
        COURSES_SELL_PAID: true,
        PUBLISH_COURSES: true,
        FORUM_VIEW: true,
        FORUM_POST: true
      },
      limits: {}
    }
  };
}

export function resolveLocalFacilityPreviewSession(location?: LocalPreviewLocation) {
  const { hostname, pathname, search } = location ?? localWindowLocation();
  if (!isLocalPreviewHost(hostname)) return null;
  if (isCommercialPreviewRoute(pathname) || isPersonalPreviewRoute(pathname)) return null;

  const params = new URLSearchParams(search);
  const devPlan = String(params.get("devPlan") || "").toLowerCase();
  const facilityParam = String(params.get("facility") || "").toLowerCase();
  const wantsFacility =
    isFacilityPreviewRoute(pathname) ||
    devPlan === "facility" ||
    facilityParam === "1" ||
    facilityParam === "true";

  if (!wantsFacility) return null;

  const email =
    String(params.get("facilityEmail") || "")
      .trim()
      .toLowerCase() || LOCAL_FACILITY_PREVIEW_EMAIL;
  const displayName = String(params.get("facilityName") || "Facility Demo Operator");
  const facilityId =
    String(params.get("facilityId") || "")
      .trim()
      .toLowerCase() || LOCAL_FACILITY_PREVIEW_ID;
  const facilityRole = String(params.get("facilityRole") || "OWNER").toUpperCase();

  return {
    token: LOCAL_FACILITY_PREVIEW_TOKEN,
    user: {
      id: "local-facility-preview-user",
      email,
      displayName,
      role: "admin" as const,
      plan: "facility",
      subscriptionStatus: "active",
      emailVerified: true
    },
    ctx: {
      mode: "facility",
      plan: "facility",
      requestedPlan: "facility",
      subscriptionStatus: "active",
      facilityId,
      facilityRole,
      capabilities: {
        FACILITY_ACCESS: true,
        TASKS_READ: true,
        TASKS_WRITE: true,
        GROWS_READ: true,
        GROWS_WRITE: true,
        PLANTS_READ: true,
        PLANTS_WRITE: true,
        GROWLOGS_READ: true,
        GROWLOGS_WRITE: true,
        INVENTORY_READ: true,
        INVENTORY_WRITE: true,
        COMPLIANCE_READ: true,
        COMPLIANCE_WRITE: true,
        AUDIT_READ: true,
        SOP_RUNS_READ: true,
        SOP_RUNS_WRITE: true,
        TEAM_VIEW: true,
        TEAM_INVITE: true,
        TEAM_UPDATE_ROLE: true,
        TEAM_REMOVE: true,
        ROOMS_EQUIPMENT_STAFF: true,
        FACILITY_SETTINGS_EDIT: true,
        EXPORT_COMPLIANCE: true,
        COURSES_VIEW: true,
        COURSES_CREATE: true,
        COURSES_SELL_PAID: true,
        FORUM_VIEW: true,
        FORUM_POST: true
      },
      limits: {}
    }
  };
}

export function resolveLocalPersonalPreviewSession(location?: LocalPreviewLocation) {
  const { hostname, pathname, search } = location ?? localWindowLocation();
  if (!isLocalPreviewHost(hostname)) return null;
  if (isCommercialPreviewRoute(pathname) || isFacilityPreviewRoute(pathname)) return null;

  const params = new URLSearchParams(search);
  const devPlan = String(params.get("devPlan") || "").toLowerCase();
  const personalParam = String(params.get("personal") || "").toLowerCase();
  const singleParam = String(params.get("single") || "").toLowerCase();
  const paidParam = String(params.get("paid") || "").toLowerCase();
  const isProPreview =
    devPlan === "pro" ||
    devPlan === "personal" ||
    paidParam === "1" ||
    paidParam === "true";
  const wantsPersonal =
    isPersonalPreviewRoute(pathname) ||
    devPlan === "free" ||
    devPlan === "pro" ||
    devPlan === "personal" ||
    personalParam === "1" ||
    personalParam === "true" ||
    singleParam === "1" ||
    singleParam === "true";

  if (!wantsPersonal) return null;

  const email =
    String(params.get("singleEmail") || params.get("personalEmail") || "")
      .trim()
      .toLowerCase() ||
    (isProPreview ? LOCAL_PERSONAL_PRO_PREVIEW_EMAIL : LOCAL_PERSONAL_PREVIEW_EMAIL);
  const displayName = String(
    params.get("singleName") ||
      (isProPreview ? "Single User Pro Demo" : "Single Free Demo")
  );
  const plan = isProPreview ? "pro" : "free";
  const subscriptionStatus = isProPreview ? "active" : "free";

  return {
    token: LOCAL_PERSONAL_PREVIEW_TOKEN,
    user: {
      id: "local-personal-preview-user",
      email,
      displayName,
      role: "user" as const,
      plan,
      subscriptionStatus,
      emailVerified: true
    },
    ctx: {
      mode: "personal",
      plan,
      requestedPlan: plan,
      subscriptionStatus,
      capabilities: {
        GROWS_PERSONAL_VIEW: true,
        GROWS_PERSONAL_WRITE: true,
        LOGS_PERSONAL_VIEW: true,
        LOGS_PERSONAL_WRITE: true,
        PLANTS_PERSONAL_VIEW: true,
        PLANTS_PERSONAL_WRITE: true,
        AI_ASSISTANT: true,
        DIAGNOSE_BASIC: true,
        DIAGNOSE_AI: true,
        TOOLS_VPD: true,
        FEEDING_SCHEDULE: true,
        TASK_REMINDERS: true,
        TOOL_TIMELINE_PLANNER: true,
        ...(isProPreview
          ? {
              ALERTS_VIEW: true,
              ALERTS_ACK: true,
              DASHBOARD_ANALYTICS: true,
              DASHBOARD_EXPORT: true,
              DIAGNOSE_ADVANCED: true,
              DIAGNOSE_EXPORT: true,
              COURSES_SELL_PAID: true,
              TOOL_NPK: true,
              TOOL_HARVEST_ESTIMATOR: true,
              TOOL_PDF_EXPORT: true,
              TOOL_PHENO_MATRIX: true
            }
          : {}),
        COURSES_VIEW: true,
        COURSES_CREATE: true,
        FORUM_VIEW: true,
        FORUM_POST: true
      },
      limits: isProPreview
        ? { maxGrows: 999, maxPlants: 999, maxPaidCourses: 5, maxLessonsPerCourse: 20 }
        : { maxGrows: 1, maxPlants: 1, maxPaidCourses: 1, maxLessonsPerCourse: 7 }
    }
  };
}

export function resolveLocalPreviewSession(location?: LocalPreviewLocation) {
  const resolvedLocation = location ?? localWindowLocation();
  if (isCommercialPreviewRoute(resolvedLocation.pathname)) {
    return resolveLocalCommercialPreviewSession(resolvedLocation);
  }
  if (isFacilityPreviewRoute(resolvedLocation.pathname)) {
    return resolveLocalFacilityPreviewSession(resolvedLocation);
  }
  if (isPersonalPreviewRoute(resolvedLocation.pathname)) {
    return resolveLocalPersonalPreviewSession(resolvedLocation);
  }
  return (
    resolveLocalFacilityPreviewSession(resolvedLocation) ||
    resolveLocalCommercialPreviewSession(resolvedLocation) ||
    resolveLocalPersonalPreviewSession(resolvedLocation)
  );
}

function mergeAuthUser(
  current: AuthUser | null,
  next: AuthUser | null | undefined
): AuthUser | null {
  if (!next) return current;
  if (!current) return next;

  return {
    ...current,
    ...next,
    email: next.email || current.email,
    displayName: next.displayName || current.displayName,
    role: next.role || current.role,
    plan: next.plan ?? current.plan,
    subscriptionStatus: next.subscriptionStatus ?? current.subscriptionStatus,
    emailVerified: next.emailVerified ?? current.emailVerified
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const routeParams = useGlobalSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ctx, setCtx] = useState<any | null>(null);
  const [meStatus, setMeStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [meError, setMeError] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  // Prevent rehydration loops - hydrate only once
  const didHydrateRef = useRef(false);
  // Prevent multiple logout operations in flight
  const isLoggingOutRef = useRef(false);
  const routePreviewKey = useMemo(
    () => `${pathname || ""}?${safeStableParams(routeParams)}`,
    [pathname, routeParams]
  );

  // Hard logout that prevents token from reappearing
  const hardLogout = async () => {
    if (isLoggingOutRef.current) return; // Already logging out
    isLoggingOutRef.current = true;

    try {
      setToken(null);
      setUser(null);
      setCtx(null);
      setMeStatus("idle");
      setMeError(null);
      await persistToken(null);
    } finally {
      isLoggingOutRef.current = false;
    }
  };

  async function loadMeForToken() {
    setMeStatus("loading");
    setMeError(null);
    try {
      const me = await apiMe();
      setUser((current) => mergeAuthUser(current, me.user));
      setCtx(me.ctx ?? null);
      setMeStatus("ready");
      setMeError(null);
    } catch (e: any) {
      if (e?.status === 401) {
        console.log("[AUTH] Token rejected by server (401), clearing");
        await hardLogout();
        return;
      }
      // Keep token for retry, but do not let routing silently fall back.
      setMeStatus("error");
      setMeError(
        "Unable to verify session from /api/me. Check backend connectivity and retry."
      );
      console.error("[AUTH] Failed to load /api/me:", e);
    }
  }

  // Wire global 401 invalidation: any 401 from any endpoint (except login/signup) triggers hardLogout
  useEffect(() => {
    setOnUnauthorized(() => {
      void hardLogout();
    });
    return () => {
      setOnUnauthorized(null);
    };
  }, []);

  useEffect(() => {
    // Only hydrate once
    if (didHydrateRef.current) return;
    didHydrateRef.current = true;

    let mounted = true;
    (async () => {
      try {
        const localPreview = resolveLocalPreviewSession();
        if (localPreview) {
          setToken(localPreview.token);
          setUser(localPreview.user);
          setCtx(localPreview.ctx);
          setMeStatus("ready");
          setMeError(null);
          return;
        }

        const t = await readToken();
        if (!mounted) return;

        if (t) {
          setToken(t);
          if (mounted) {
            await loadMeForToken();
          }
        } else {
          setMeStatus("idle");
          setMeError(null);
        }
      } finally {
        if (mounted) setIsHydrating(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isHydrating) return;

    const localPreview = resolveLocalPreviewSession();
    if (!localPreview) return;

    const hasLocalPreviewToken =
      token === LOCAL_COMMERCIAL_PREVIEW_TOKEN ||
      token === LOCAL_FACILITY_PREVIEW_TOKEN ||
      token === LOCAL_PERSONAL_PREVIEW_TOKEN;
    if (token && !hasLocalPreviewToken) return;
    if (
      token === localPreview.token &&
      user?.email === localPreview.user.email &&
      ctx?.mode === localPreview.ctx.mode
    ) {
      return;
    }

    setToken(localPreview.token);
    setUser(localPreview.user);
    setCtx(localPreview.ctx);
    setMeStatus("ready");
    setMeError(null);
  }, [routePreviewKey, isHydrating, token, user?.email, ctx?.mode]);

  // Register push token after login/hydration
  usePushRegistration({
    userId: user?.id ?? null,
    token,
    isHydrating
  });

  async function login(email: string, password: string) {
    try {
      const loginRes = await apiLogin({ email, password });
      await persistToken(loginRes.token);
      setToken(loginRes.token);
      setUser(loginRes.user);
      await loadMeForToken();
    } catch (err: any) {
      // Pass through normalized errors so UI can branch on code/status
      throw err;
    }
    // Fire analytics after successful auth (fire-and-forget)
    void logEvent("USER_LOGIN");
  }

  async function signup(body: SignupBody): Promise<SignupResponse> {
    try {
      const signupRes = await apiSignup(body);
      if (signupRes.token) {
        await persistToken(signupRes.token);
        setToken(signupRes.token);
        setUser(signupRes.user ?? null);
        await loadMeForToken();
      } else {
        await persistToken(null);
        setToken(null);
        setUser(null);
        setCtx(null);
        setMeStatus("idle");
        setMeError(null);
      }
      void logEvent("USER_REGISTER");
      return signupRes;
    } catch (err: any) {
      // Pass through normalized errors so UI can branch on code/status
      throw err;
    }
  }

  async function logout() {
    await hardLogout();
  }

  async function retryMe() {
    if (!token) return;
    await loadMeForToken();
  }

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      ctx,
      meStatus,
      meError,
      isHydrating,
      isAuthed: !!token,
      login,
      signup,
      logout,
      retryMe
    }),
    [token, user, ctx, meStatus, meError, isHydrating]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function safeStableParams(params: Record<string, unknown>) {
  try {
    return JSON.stringify(
      Object.entries(params || {})
        .map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value])
        .sort(([a], [b]) => String(a).localeCompare(String(b)))
    );
  } catch {
    return "";
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// Optional helper to display best error message in UI
export function getAuthErrorMessage(e: unknown) {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as any).message);
  }
  if (typeof e === "string") return e;
  return "Something went wrong.";
}
