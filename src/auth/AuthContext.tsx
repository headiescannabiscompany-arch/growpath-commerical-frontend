import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { logEvent } from "../api/events";
import { usePushRegistration } from "../hooks/usePushRegistration";
import {
  login as apiLogin,
  signup as apiSignup,
  type AuthUser,
  type SignupBody
} from "../api/auth";
import { setToken as persistToken, getToken as readToken } from "./tokenStore";
import { setAuthToken } from "../api/client";
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const t = await readToken();
        if (!mounted) return;
        setToken(t);
        setAuthToken(t); // keep api client in sync
        if (t) {
          try {
            const me = await apiMe();
            if (mounted) setUser(me.user);
          } catch {
            // If token is invalid/expired, clear it
            if (mounted) {
              setToken(null);
              setAuthToken(null); // keep api client in sync
              setUser(null);
              await persistToken(null);
            }
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
    const res = await apiLogin({ email, password });
    setToken(res.token);
    setAuthToken(res.token); // critical
    setUser(res.user);
    await persistToken(res.token);
    logEvent("USER_LOGIN");
  }

  async function signup(body: SignupBody) {
    const res = await apiSignup(body);
    setToken(res.token);
    setAuthToken(res.token); // critical
    setUser(res.user);
    await persistToken(res.token);
    logEvent("USER_REGISTER");
  }

  async function logout() {
    setToken(null);
    setAuthToken(null); // critical
    setUser(null);
    await persistToken(null);
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

  console.log(
    "[AUTH DEBUG] AuthContext typeof =",
    typeof AuthContext,
    "value =",
    AuthContext
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
