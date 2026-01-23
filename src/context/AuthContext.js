import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthToken } from "../api/client";
import { MODES } from "../constants/userModes";
import { CAPABILITIES } from "../capabilities/keys";
import { getEntitlements } from "../utils/entitlements";
import { deriveCapabilities } from "../config/capabilities";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const defaultCapabilities = Object.fromEntries(
    Object.values(CAPABILITIES).map((k) => [k, false])
  );
  const defaultLimits = { maxPlants: 1, maxGrows: 1 };
  const [plan, setPlan] = useState("free");
  const [capabilities, setCapabilities] = useState({ ...defaultCapabilities });
  const [limits, setLimits] = useState({ ...defaultLimits });

  const applyUserState = (userData, storedModeFallback) => {
    if (!userData) {
      setPlan("free");
      setModeState(MODES.PERSONAL);
      setCapabilities({ ...defaultCapabilities });
      setLimits({ ...defaultLimits });
      return;
    }
    // 1) entitlements must always exist
    const ent =
      (typeof getEntitlements === "function" ? getEntitlements(userData || null) : {}) ||
      {};

    // 2) plan must never be undefined
    const nextPlan = ent.plan || userData?.plan || "free";
    setPlan(nextPlan);

    // 3) mode must be derived consistently
    const nextMode =
      userData?.mode ||
      storedModeFallback ||
      (ent.hasFacility ? "facility" : ent.hasCommercial ? "commercial" : "personal");
    setModeState(nextMode);

    // 4) capabilities must always be an object with canonical keys
    const canonicalCaps = { ...defaultCapabilities };
    if (nextMode === "personal") {
      canonicalCaps[CAPABILITIES.VIEW_DASHBOARD] = true;
      canonicalCaps[CAPABILITIES.VIEW_PROFILE] = true;
      canonicalCaps[CAPABILITIES.EDIT_PROFILE] = true;
      canonicalCaps[CAPABILITIES.VIEW_COURSES] = true;
      canonicalCaps[CAPABILITIES.ENROLL_COURSE] = true;
      canonicalCaps[CAPABILITIES.VIEW_FORUM] = true;
      canonicalCaps[CAPABILITIES.POST_FORUM] = true;
    } else if (nextMode === "commercial") {
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
    } else if (nextMode === "facility") {
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
    let derived = {};
    try {
      derived =
        typeof deriveCapabilities === "function"
          ? deriveCapabilities({
              plan: nextPlan,
              mode: nextMode,
              entitlements: ent,
              limits
            })
          : {};
    } catch (_) {}
    setCapabilities({ ...derived, ...canonicalCaps });

    // 5) limits must never be undefined
    const nextLimits = {
      ...defaultLimits,
      maxPlants: ent.plants ?? defaultLimits.maxPlants,
      maxGrows: ent.grows ?? 1
    };
    setLimits(nextLimits);
    global.__AUTH_STATE__ = ent;
  };
  // ...existing code...
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const [mode, setModeState] = useState(MODES.PERSONAL);
  const [selectedFacilityId, setSelectedFacilityIdState] = useState(null);
  const [facilityFeaturesEnabled, setFacilityFeaturesEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedUser = await AsyncStorage.getItem("user");
        const storedMode = await AsyncStorage.getItem("facilityMode");
        const storedFacilityId = await AsyncStorage.getItem("selectedFacilityId");

        let parsedUser = null;
        if (storedUser) {
          try {
            parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
          } catch {
            setUser(null);
          }
        }

        if (storedToken) {
          setToken(storedToken);
          setAuthToken(storedToken);
        } else {
          setToken(null);
          setAuthToken(null);
        }

        if (storedMode) setModeState(storedMode);
        if (storedFacilityId) setSelectedFacilityIdState(storedFacilityId);

        // Apply user state after loading user and mode
        applyUserState(parsedUser, storedMode || null);
      } finally {
        setLoading(false);
        setAuthChecked(true);
      }
    })();
  }, []);

  const setMode = async (newMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem("facilityMode", newMode);
    } catch (_) {}
    applyUserState(user, newMode);
  };

  const setSelectedFacilityId = async (facilityId) => {
    setSelectedFacilityIdState(facilityId || null);
    if (facilityId) {
      await AsyncStorage.setItem("selectedFacilityId", facilityId).catch(() => {});
    } else {
      await AsyncStorage.removeItem("selectedFacilityId").catch(() => {});
    }
    global.selectedFacilityId = facilityId || null;
  };

  const updateUser = async (nextUser) => {
    setUser(nextUser || null);
    await AsyncStorage.setItem("user", JSON.stringify(nextUser || null)).catch(() => {});
  };

  const logout = async () => {
    await AsyncStorage.removeItem("token").catch(() => {});
    await AsyncStorage.removeItem("user").catch(() => {});
    await AsyncStorage.removeItem("facilityMode").catch(() => {});
    await AsyncStorage.removeItem("selectedFacilityId").catch(() => {});

    setToken(null);
    setAuthToken(null);
    setUser(null);

    setModeState(MODES.PERSONAL);
    setSelectedFacilityIdState(null);
    setFacilityFeaturesEnabled(false);
  };

  const value = useMemo(
    () => ({
      loading,
      authChecked,
      token,
      user,
      plan,
      mode,
      setMode,
      selectedFacilityId,
      setSelectedFacilityId,
      facilityFeaturesEnabled,
      setFacilityFeaturesEnabled,
      updateUser,
      logout,
      capabilities,
      limits
    }),
    [
      loading,
      authChecked,
      token,
      user,
      plan,
      mode,
      selectedFacilityId,
      facilityFeaturesEnabled,
      capabilities,
      limits
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
