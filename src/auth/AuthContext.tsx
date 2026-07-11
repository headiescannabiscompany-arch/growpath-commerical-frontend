/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef
} from "react";
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

export function resolveLocalCommercialPreviewSession() {
  const { hostname, pathname, search } = localWindowLocation();
  if (!isLocalPreviewHost(hostname)) return null;

  const params = new URLSearchParams(search);
  const devPlan = String(params.get("devPlan") || "").toLowerCase();
  const commercialParam = String(params.get("commercial") || "").toLowerCase();
  const isCommercialRoute =
    pathname === "/home/commercial" || pathname.startsWith("/home/commercial/");
  const wantsCommercial =
    isCommercialRoute ||
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
        const localPreview = resolveLocalCommercialPreviewSession();
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
