import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSubscriptionStatus } from "../api/subscribe";
import { getEntitlements } from "../utils/entitlements";
import { updateGrowInterests } from "../api/users";
import { ONBOARDING_INTERESTS_KEY } from "../constants/storageKeys";
import { normalizePendingInterests } from "../utils/growInterests";
import { deriveCapabilities } from "../config/capabilities.ts";

// --- Capabilities and Limits Schema ---
// See capability schema in requirements
import { CAPABILITIES } from "../capabilities/keys";

// Default capabilities object using canonical keys
const defaultCapabilities = {
  [CAPABILITIES.VIEW_DASHBOARD]: false,
  [CAPABILITIES.VIEW_PROFILE]: false,
  [CAPABILITIES.EDIT_PROFILE]: false,
  [CAPABILITIES.VIEW_COURSES]: false,
  [CAPABILITIES.ENROLL_COURSE]: false,
  [CAPABILITIES.MANAGE_ENROLLMENTS]: false,
  [CAPABILITIES.VIEW_FORUM]: false,
  [CAPABILITIES.POST_FORUM]: false,
  [CAPABILITIES.MANAGE_USERS]: false,
  [CAPABILITIES.MANAGE_FACILITY]: false,
  [CAPABILITIES.VIEW_PAYMENTS]: false,
  [CAPABILITIES.MANAGE_PAYMENTS]: false
};

const defaultLimits = {
  maxPlants: 0,
  maxGrowAreas: 0,
  maxUploadsPerDay: 0,
  maxPostsPerDay: 0,
  maxCoursesPerMonth: 0,
  maxCoursePublishPerDay: 0
};

export const AuthContext = createContext();

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.API_URL ||
  process.env.REACT_NATIVE_APP_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:5001";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState("free");
  const [mode, setModeState] = useState("personal"); // "personal", "facility", or "commercial"
  const [capabilities, setCapabilities] = useState(defaultCapabilities);
  const [limits, setLimits] = useState(defaultLimits);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasNavigatedAwayFromHome, setHasNavigatedAwayFromHome] = useState(false);
  const [suppressWelcomeMessage, setSuppressWelcomeMessage] = useState(false);
  console.log("[AuthProvider] API_BASE_URL:", API_BASE_URL);

  // Helper: get allowed modes for the current user/entitlements
  const getAllowedModes = (userData = user) => {
    // This logic can be expanded based on entitlements structure
    const ent = getEntitlements(userData);
    const modes = ["personal"];
    if (ent.facilityAccess) modes.push("facility");
    if (ent.commercialAccess) modes.push("commercial");
    // For dev/admin, you may want to always allow all
    return modes;
  };
  const [facilityFeaturesEnabled, setFacilityFeaturesEnabled] = useState(true); // Commercial users can toggle this
  const [selectedFacilityId, setSelectedFacilityIdState] = useState(null);
  const [facilitiesAccess, setFacilitiesAccess] = useState([]); // Array of { facilityId, role, roomIds }

  // --- Capability and Limits Derivation ---
  // --- Capability and Limits Derivation ---
  // Build capabilities using canonical keys for registry
  const buildCapabilities = (entitlements, mode) => {
    // Map plan/mode/entitlements to canonical capability keys
    const plan = entitlements?.plan || "free";
    const caps = { ...defaultCapabilities };
    // Personal plan: basic access
    if (plan === "personal" || mode === "personal") {
      caps[CAPABILITIES.VIEW_DASHBOARD] = true;
      caps[CAPABILITIES.VIEW_PROFILE] = true;
      caps[CAPABILITIES.EDIT_PROFILE] = true;
      caps[CAPABILITIES.VIEW_COURSES] = true;
      caps[CAPABILITIES.ENROLL_COURSE] = true;
      caps[CAPABILITIES.VIEW_FORUM] = true;
      caps[CAPABILITIES.POST_FORUM] = true;
    }
    if (plan === "commercial" || mode === "commercial") {
      caps[CAPABILITIES.VIEW_DASHBOARD] = true;
      caps[CAPABILITIES.VIEW_PROFILE] = true;
      caps[CAPABILITIES.EDIT_PROFILE] = true;
      caps[CAPABILITIES.VIEW_COURSES] = true;
      caps[CAPABILITIES.ENROLL_COURSE] = true;
      caps[CAPABILITIES.MANAGE_ENROLLMENTS] = true;
      caps[CAPABILITIES.VIEW_FORUM] = true;
      caps[CAPABILITIES.POST_FORUM] = true;
      caps[CAPABILITIES.MANAGE_USERS] = true;
      caps[CAPABILITIES.VIEW_PAYMENTS] = true;
    }
    if (plan === "facility" || mode === "facility") {
      caps[CAPABILITIES.VIEW_DASHBOARD] = true;
      caps[CAPABILITIES.VIEW_PROFILE] = true;
      caps[CAPABILITIES.EDIT_PROFILE] = true;
      caps[CAPABILITIES.VIEW_COURSES] = true;
      caps[CAPABILITIES.ENROLL_COURSE] = true;
      caps[CAPABILITIES.MANAGE_ENROLLMENTS] = true;
      caps[CAPABILITIES.VIEW_FORUM] = true;
      caps[CAPABILITIES.POST_FORUM] = true;
      caps[CAPABILITIES.MANAGE_USERS] = true;
      caps[CAPABILITIES.MANAGE_FACILITY] = true;
      caps[CAPABILITIES.VIEW_PAYMENTS] = true;
      caps[CAPABILITIES.MANAGE_PAYMENTS] = true;
    }
    return caps;
  };
  const buildLimits = (entitlements) => {
    // Example: customize these values as needed
    if (entitlements.plan === "pro") {
      return {
        maxPlants: 50,
        maxGrowAreas: 10,
        maxUploadsPerDay: 20,
        maxPostsPerDay: 10,
        maxCoursesPerMonth: 5,
        maxCoursePublishPerDay: 2
      };
    }
    if (entitlements.hasFacility || entitlements.hasCommercial) {
      return {
        maxPlants: 500,
        maxGrowAreas: 50,
        maxUploadsPerDay: 100,
        maxPostsPerDay: 50,
        maxCoursesPerMonth: 20,
        maxCoursePublishPerDay: 10
      };
    }
    // Free tier
    return {
      maxPlants: 5,
      maxGrowAreas: 2,
      maxUploadsPerDay: 2,
      maxPostsPerDay: 2,
      maxCoursesPerMonth: 1,
      maxCoursePublishPerDay: 1
    };
  };

  const updateStateFromUser = (userData) => {
    const entitlements = getEntitlements(userData);
    setPlan(entitlements.plan || "free");
    // Derive all capabilities (feature-based)
    const derived = deriveCapabilities({
      plan: entitlements.plan || "free",
      mode,
      entitlements,
      limits
    });
    // Map to canonical keys for navigation gating
    const canonicalCaps = { ...defaultCapabilities };
    // Personal plan: basic access
    if (entitlements.plan === "personal" || mode === "personal") {
      canonicalCaps[CAPABILITIES.VIEW_DASHBOARD] = true;
      canonicalCaps[CAPABILITIES.VIEW_PROFILE] = true;
      canonicalCaps[CAPABILITIES.EDIT_PROFILE] = true;
      canonicalCaps[CAPABILITIES.VIEW_COURSES] = true;
      canonicalCaps[CAPABILITIES.ENROLL_COURSE] = true;
      canonicalCaps[CAPABILITIES.VIEW_FORUM] = true;
      canonicalCaps[CAPABILITIES.POST_FORUM] = true;
    }
    if (entitlements.plan === "commercial" || mode === "commercial") {
      canonicalCaps[CAPABILITIES.VIEW_DASHBOARD] = true;
      canonicalCaps[CAPABILITIES.VIEW_PROFILE] = true;
      canonicalCaps[CAPABILITIES.EDIT_PROFILE] = true;
      canonicalCaps[CAPABILITIES.VIEW_COURSES] = true;
      canonicalCaps[CAPABILITIES.ENROLL_COURSE] = true;
      canonicalCaps[CAPABILITIES.MANAGE_ENROLLMENTS] = true;
      canonicalCaps[CAPABILITIES.VIEW_FORUM] = true;
      canonicalCaps[CAPABILITIES.POST_FORUM] = true;
      canonicalCaps[CAPABILITIES.MANAGE_USERS] = true;
      canonicalCaps[CAPABILITIES.VIEW_PAYMENTS] = true;
    }
    if (entitlements.plan === "facility" || mode === "facility") {
      canonicalCaps[CAPABILITIES.VIEW_DASHBOARD] = true;
      canonicalCaps[CAPABILITIES.VIEW_PROFILE] = true;
      canonicalCaps[CAPABILITIES.EDIT_PROFILE] = true;
      canonicalCaps[CAPABILITIES.VIEW_COURSES] = true;
      canonicalCaps[CAPABILITIES.ENROLL_COURSE] = true;
      canonicalCaps[CAPABILITIES.MANAGE_ENROLLMENTS] = true;
      canonicalCaps[CAPABILITIES.VIEW_FORUM] = true;
      canonicalCaps[CAPABILITIES.POST_FORUM] = true;
      canonicalCaps[CAPABILITIES.MANAGE_USERS] = true;
      canonicalCaps[CAPABILITIES.MANAGE_FACILITY] = true;
      canonicalCaps[CAPABILITIES.VIEW_PAYMENTS] = true;
      canonicalCaps[CAPABILITIES.MANAGE_PAYMENTS] = true;
    }
    setCapabilities({ ...derived, ...canonicalCaps });
    setLimits({ maxGrows: entitlements.grows || 1, maxPlants: entitlements.plants || 1 });
    setTokenBalance(entitlements.tokenBalance || 0);
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

      console.log(
        "[AuthContext] loadAuth: storedToken=",
        storedToken,
        "storedUser=",
        storedUser,
        "storedMode=",
        storedMode,
        "storedFacilityId=",
        storedFacilityId
      );

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
      console.log("[AuthContext] loadAuth: loading set to false");
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
    const baseUrl = API_BASE_URL.replace(/\/$/, "");
    try {
      const response = await fetch(`${baseUrl}/api/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken || token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.status === 401) {
        // Token invalid/expired: clear auth and show login
        await logout();
        return;
      }

      let facilitiesAccessResponse = [];
      if (response.ok) {
        const data = await response.json();
        facilitiesAccessResponse = data.facilitiesAccess || [];
      }

      if (!facilitiesAccessResponse.length) {
        try {
          const facilitiesResp = await fetch(`${baseUrl}/api/facilities`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${authToken || token}`,
              "Content-Type": "application/json"
            }
          });

          if (facilitiesResp.ok) {
            const facilitiesData = await facilitiesResp.json();
            const facilitiesList =
              facilitiesData?.facilities || facilitiesData?.data || [];

            if (facilitiesList.length) {
              facilitiesAccessResponse = facilitiesList
                .filter((facility) => facility?._id)
                .map((facility) => ({
                  facilityId: facility._id.toString(),
                  role: "admin",
                  permissions: ["read", "write", "delete", "admin"]
                }));

              if (!selectedFacilityId && facilitiesAccessResponse[0]?.facilityId) {
                const defaultFacilityId = facilitiesAccessResponse[0].facilityId;
                setSelectedFacilityIdState(defaultFacilityId);
                AsyncStorage.setItem("selectedFacilityId", defaultFacilityId).catch(
                  () => {}
                );
              }
            }
          }
        } catch (fallbackError) {
          console.log("Failed to infer facility access:", fallbackError.message);
        }
      }

      setFacilitiesAccess(facilitiesAccessResponse);
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
        plan,
        mode,
        setMode,
        capabilities,
        limits,
        tokenBalance,
        loading,
        login,
        logout,
        updateUser,
        hasNavigatedAwayFromHome,
        setHasNavigatedAwayFromHome,
        suppressWelcomeMessage,
        setSuppressWelcomeMessage,
        selectedFacilityId,
        setSelectedFacilityId,
        facilitiesAccess,
        facilityFeaturesEnabled,
        setFacilityFeaturesEnabled
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
