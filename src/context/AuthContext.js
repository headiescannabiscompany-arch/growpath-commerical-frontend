import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSubscriptionStatus } from "../api/subscribe";
import { getEntitlements } from "../utils/entitlements";
import { updateGrowInterests } from "../api/users";
import { ONBOARDING_INTERESTS_KEY } from "../constants/storageKeys";
import { normalizePendingInterests } from "../utils/growInterests";

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
  const [suppressWelcomeMessage, setSuppressWelcomeMessage] = useState(false);
  const [mode, setModeState] = useState("personal"); // "personal" or "facility"
  const [selectedFacilityId, setSelectedFacilityIdState] = useState(null);
  const [facilitiesAccess, setFacilitiesAccess] = useState([]); // Array of { facilityId, role, roomIds }

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
      const storedMode = await Promise.race([
        AsyncStorage.getItem("facilityMode"),
        storageTimeout
      ]);
      const storedFacilityId = await Promise.race([
        AsyncStorage.getItem("selectedFacilityId"),
        storageTimeout
      ]);

      if (storedToken) {
        const parsedUser = storedUser ? JSON.parse(storedUser) : null;
        setToken(storedToken);
        setUser(parsedUser);
        if (storedMode) setModeState(storedMode);
        if (storedFacilityId) setSelectedFacilityIdState(storedFacilityId);
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

        // Load facility access
        try {
          await loadFacilityAccess(storedToken);
        } catch (err) {
          console.log("Failed to load facility access:", err.message);
        }
      } else {
        syncGlobals(null, null);
        setToken(null);
        setUser(null);
        setModeState("personal");
        setSelectedFacilityIdState(null);
        setFacilitiesAccess([]);
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

  const loadFacilityAccess = async (authToken) => {
    try {
      const response = await fetch("http://localhost:5001/api/auth/me", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken || token}`,
          "Content-Type": "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFacilitiesAccess(data.facilitiesAccess || []);
      }
    } catch (error) {
      console.log("Failed to load facility access:", error.message);
    }
  };

  const applyPendingOnboardingInterests = async (baseUser = null) => {
    // This is a commercial/facilities app - we don't use consumer interests
    // Just clear any pending interests from storage
    try {
      await AsyncStorage.removeItem(ONBOARDING_INTERESTS_KEY);
    } catch (error) {
      // ignore
    }
  };

  const updateUser = async (newUserData) => {
    const merged = { ...user, ...newUserData };
    setUser(merged);
    syncGlobals(token, merged);
    try {
      await AsyncStorage.setItem("user", JSON.stringify(merged));
    } catch (e) {
      console.log("Failed to persist user update", e);
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
    loadFacilityAccess(authToken).catch(() => {});
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("facilityMode");
      await AsyncStorage.removeItem("selectedFacilityId");
      setToken(null);
      setUser(null);
      setIsPro(false);
      setIsGuildMember(false);
      setSubscriptionStatus("free");
      setHasNavigatedAwayFromHome(false);
      setModeState("personal");
      setSelectedFacilityIdState(null);
      setFacilitiesAccess([]);
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

  const setMode = async (newMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem("facilityMode", newMode);
    } catch (e) {
      console.log("Failed to persist facility mode", e);
    }
  };

  const setSelectedFacilityId = async (facilityId) => {
    setSelectedFacilityIdState(facilityId);
    try {
      if (facilityId) {
        await AsyncStorage.setItem("selectedFacilityId", facilityId);
      } else {
        await AsyncStorage.removeItem("selectedFacilityId");
      }
    } catch (e) {
      console.log("Failed to persist selected facility id", e);
    }
  };

  useEffect(() => {
    if (token && user) {
      applyPendingOnboardingInterests(user);
    }
  }, [token, user]);

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
        updateUser,
        refreshProStatus,
        hasNavigatedAwayFromHome,
        setHasNavigatedAwayFromHome,
        suppressWelcomeMessage,
        setSuppressWelcomeMessage,
        mode,
        setMode,
        selectedFacilityId,
        setSelectedFacilityId,
        facilitiesAccess
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
