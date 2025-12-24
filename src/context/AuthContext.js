import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSubscriptionStatus } from "../api/subscribe";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState("free");
  const [isGuildMember, setIsGuildMember] = useState(false);
  const [loading, setLoading] = useState(true);

  // Helper to check if user has access to premium tools (Pro OR Guild Member)
  const isEntitled = isPro || isGuildMember;

  useEffect(() => {
    loadAuth();
  }, []);

  const syncGlobals = (authToken, userData) => {
    global.authToken = authToken || null;
    global.user = userData || null;
    if (userData) {
      setIsGuildMember(Array.isArray(userData.guilds) && userData.guilds.length > 0);
      setSubscriptionStatus(userData.subscriptionStatus || "free");
    } else {
      setIsGuildMember(false);
      setSubscriptionStatus("free");
    }
  };

  const loadAuth = async () => {
    try {
      // ... existing storage logic ...
      const storageTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Storage timeout")), 1000)
      );

      const storedToken = await Promise.race([
        AsyncStorage.getItem("token"),
        storageTimeout
      ]);
      const storedUser = await Promise.race([
        AsyncStorage.getItem("user"),
        storageTimeout
      ]);

      if (storedToken) {
        const parsedUser = storedUser ? JSON.parse(storedUser) : null;
        setToken(storedToken);
        setUser(parsedUser);
        syncGlobals(storedToken, parsedUser);
        
        // Load PRO status with timeout
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 3000)
        );

        try {
          await Promise.race([loadProStatus(storedToken), timeout]);
        } catch (err) {
          // Continue without updated PRO status
        }
      } else {
        syncGlobals(null, null);
        setToken(null);
        setUser(null);
        setIsPro(false);
      }
    } catch (error) {
      console.log("Auth load failed:", error.message);
      syncGlobals(null, null);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadProStatus = async (authToken) => {
    try {
      const result = await getSubscriptionStatus(authToken || token);
      if (result.success) {
        setSubscriptionStatus(result.status);
        setIsPro(result.status === "active" || result.status === "trial");
      }
    } catch (error) {
      setIsPro(false);
    }
  };

  const login = async (authToken, userData) => {
    setToken(authToken);
    setUser(userData);
    syncGlobals(authToken, userData);

    AsyncStorage.setItem("token", authToken).catch(() => {});
    AsyncStorage.setItem("user", JSON.stringify(userData)).catch(() => {});

    loadProStatus(authToken).catch(() => {});
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      setToken(null);
      setUser(null);
      setIsPro(false);
      setIsGuildMember(false);
      setSubscriptionStatus("free");
      syncGlobals(null, null);
    } catch (error) {
      // Failed to logout
    }
  };

  const refreshProStatus = () => {
    loadProStatus();
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isPro,
        subscriptionStatus,
        isGuildMember,
        isEntitled,
        loading,
        login,
        logout,
        refreshProStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
