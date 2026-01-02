import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSubscriptionStatus } from "../api/subscribe";
import { getEntitlements } from "../utils/entitlements";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState("free");
  const [isGuildMember, setIsGuildMember] = useState(false);
  const [isEntitled, setIsEntitled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasNavigatedAwayFromHome, setHasNavigatedAwayFromHome] = useState(false);

  const updateStateFromUser = (userData) => {
    const entitlements = getEntitlements(userData);
    setIsPro(entitlements.isPro);
    setIsGuildMember(entitlements.isGuildMember);
    setIsEntitled(entitlements.isEntitled);
    setSubscriptionStatus(entitlements.subscriptionStatus);

    // Expose for logic tests
    global.__AUTH_STATE__ = entitlements;
  };

  useEffect(() => {
    loadAuth();
  }, []);

  const syncGlobals = (authToken, userData) => {
    global.authToken = authToken || null;
    global.user = userData || null;
    updateStateFromUser(userData);
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
        updateStateFromUser(null);
        setHasNavigatedAwayFromHome(false);
      }
    } catch (error) {
      console.log("Auth load failed:", error.message);
      syncGlobals(null, null);
      setToken(null);
      setUser(null);
      setHasNavigatedAwayFromHome(false);
    } finally {
      setLoading(false);
    }
  };

  const loadProStatus = async (authToken) => {
    try {
      const result = await getSubscriptionStatus(authToken || token);
      if (result.success) {
        // Construct a partial user object to calculate entitlements
        const entitlements = getEntitlements({
          subscriptionStatus: result.status,
          guilds: user?.guilds || []
        });

        setIsPro(entitlements.isPro);
        setSubscriptionStatus(entitlements.subscriptionStatus);
        setIsEntitled(entitlements.isEntitled);

        global.__AUTH_STATE__ = { ...global.__AUTH_STATE__, ...entitlements };
      }
    } catch (error) {
      setIsPro(false);
    }
  };

  const login = async (authToken, userData) => {
    setToken(authToken);
    setUser(userData);
    setHasNavigatedAwayFromHome(false);
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
      setHasNavigatedAwayFromHome(false);
      syncGlobals(null, null);
      if (global.__NAV__?.resetRoot) {
        global.__NAV__.resetRoot({
          index: 0,
          routes: [{ name: "Login" }]
        });
      } else if (global.__NAV__?.navigate) {
        global.__NAV__.navigate("Login");
      }
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
        refreshProStatus,
        hasNavigatedAwayFromHome,
        setHasNavigatedAwayFromHome
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
