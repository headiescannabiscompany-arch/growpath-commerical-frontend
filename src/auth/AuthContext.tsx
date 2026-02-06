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
  type SignupBody
} from "../api/auth";
import { setToken as persistToken, getToken as readToken } from "./tokenStore";
import { setAuthToken, setOnUnauthorized } from "../api/client";
import { apiMe } from "../api/me";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isHydrating: boolean;
  isAuthed: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (body: SignupBody) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
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
      setAuthToken(null);
      setToken(null);
      setUser(null);
      await persistToken(null);
    } finally {
      isLoggingOutRef.current = false;
    }
  };

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
        const t = await readToken();
        if (!mounted) return;

        if (t) {
          setToken(t);
          setAuthToken(t); // keep api client in sync

          // Try to validate token with backend
          try {
            const me = await apiMe();
            if (mounted) setUser(me.user);
          } catch (e: any) {
            // If 401, token is invalid - do hard logout
            if (e?.status === 401) {
              console.log("[AUTH] Token rejected by server (401), clearing");
              await hardLogout();
              return;
            }
            // Other errors: still clear token to avoid bad state
            console.error("[AUTH] Failed to hydrate user:", e);
            await hardLogout();
          }
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
      const res = await apiLogin({ email, password });
      setToken(res.token);
      setAuthToken(res.token); // critical
      setUser(res.user);
      await persistToken(res.token);
    } catch (err: any) {
      // Pass through normalized errors so UI can branch on code/status
      throw err;
    }
    // Fire analytics after successful auth (fire-and-forget)
    void logEvent("USER_LOGIN");
  }

  async function signup(body: SignupBody) {
    try {
      const res = await apiSignup(body);
      setToken(res.token);
      setAuthToken(res.token); // critical
      setUser(res.user);
      await persistToken(res.token);
    } catch (err: any) {
      // Pass through normalized errors so UI can branch on code/status
      throw err;
    }
    // Fire analytics after successful auth (fire-and-forget)
    void logEvent("USER_REGISTER");
  }

  async function logout() {
    await hardLogout();
  }

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      isHydrating,
      isAuthed: !!token,
      login,
      signup,
      logout
    }),
    [token, user, isHydrating]
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
