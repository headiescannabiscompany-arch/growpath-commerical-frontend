import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthToken, client as api } from "../api/client";
import ROUTES from "../api/routes";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  // On mount, load token and fetch /api/auth/me
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        if (storedToken) {
          setToken(storedToken);
          setAuthToken(storedToken);
        } else {
          setToken(null);
          setAuthToken(null);
        }

        // Fetch canonical user contract
        let userResp = null;
        try {
          userResp = await api.get(ROUTES.AUTH.ME || "/api/auth/me");
        } catch (err) {
          userResp = null;
        }
        setUser(userResp || null);
      } finally {
        setLoading(false);
        setAuthChecked(true);
      }
    })();
  }, []);

  const logout = async () => {
    await AsyncStorage.removeItem("token").catch(() => {});
    setToken(null);
    setAuthToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      loading,
      authChecked,
      token,
      user,
      logout
    }),
    [loading, authChecked, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
