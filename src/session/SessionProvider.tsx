import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppMode = "personal" | "commercial" | "facility";

export type FacilityRole = "OWNER" | "MANAGER" | "STAFF" | "VIEWER" | null;

type SessionState = {
  mode: AppMode;
  selectedFacilityId: string | null;
  facilityRole: FacilityRole;
  facilityFeaturesEnabled: boolean;

  setMode: (mode: AppMode) => void;
  setSelectedFacilityId: (facilityId: string | null) => void;
  setFacilityRole: (role: FacilityRole) => void;
  setFacilityFeaturesEnabled: (enabled: boolean) => void;

  resetSession: () => Promise<void>;
  hydrated: boolean;
};

const SessionContext = createContext<SessionState | null>(null);

const STORAGE_KEYS = {
  mode: "gp.session.mode",
  facilityId: "gp.session.facilityId",
  facilityRole: "gp.session.facilityRole",
  facilityFeaturesEnabled: "gp.session.facilityFeaturesEnabled"
} as const;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  const [mode, setModeState] = useState<AppMode>("personal");
  const [selectedFacilityId, setSelectedFacilityIdState] = useState<string | null>(null);
  const [facilityRole, setFacilityRoleState] = useState<FacilityRole>(null);
  const [facilityFeaturesEnabled, setFacilityFeaturesEnabledState] = useState(false);

  // Hydrate once at startup
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [m, fid, role, enabled] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.mode),
          AsyncStorage.getItem(STORAGE_KEYS.facilityId),
          AsyncStorage.getItem(STORAGE_KEYS.facilityRole),
          AsyncStorage.getItem(STORAGE_KEYS.facilityFeaturesEnabled)
        ]);

        if (cancelled) return;

        if (m === "personal" || m === "commercial" || m === "facility") setModeState(m);
        if (fid) setSelectedFacilityIdState(fid);
        if (role) setFacilityRoleState(role as FacilityRole);
        if (enabled === "true") setFacilityFeaturesEnabledState(true);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on change
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.mode, mode).catch(() => {});
  }, [mode, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (selectedFacilityId)
      AsyncStorage.setItem(STORAGE_KEYS.facilityId, selectedFacilityId).catch(() => {});
    else AsyncStorage.removeItem(STORAGE_KEYS.facilityId).catch(() => {});
  }, [selectedFacilityId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (facilityRole)
      AsyncStorage.setItem(STORAGE_KEYS.facilityRole, facilityRole).catch(() => {});
    else AsyncStorage.removeItem(STORAGE_KEYS.facilityRole).catch(() => {});
  }, [facilityRole, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(
      STORAGE_KEYS.facilityFeaturesEnabled,
      facilityFeaturesEnabled ? "true" : "false"
    ).catch(() => {});
  }, [facilityFeaturesEnabled, hydrated]);

  const setMode = (m: AppMode) => setModeState(m);
  const setSelectedFacilityId = (id: string | null) => setSelectedFacilityIdState(id);
  const setFacilityRole = (r: FacilityRole) => setFacilityRoleState(r);
  const setFacilityFeaturesEnabled = (enabled: boolean) =>
    setFacilityFeaturesEnabledState(enabled);

  const resetSession = async () => {
    setModeState("personal");
    setSelectedFacilityIdState(null);
    setFacilityRoleState(null);
    setFacilityFeaturesEnabledState(false);
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.mode),
      AsyncStorage.removeItem(STORAGE_KEYS.facilityId),
      AsyncStorage.removeItem(STORAGE_KEYS.facilityRole),
      AsyncStorage.removeItem(STORAGE_KEYS.facilityFeaturesEnabled)
    ]);
  };

  const value = useMemo<SessionState>(
    () => ({
      mode,
      selectedFacilityId,
      facilityRole,
      facilityFeaturesEnabled,
      setMode,
      setSelectedFacilityId,
      setFacilityRole,
      setFacilityFeaturesEnabled,
      resetSession,
      hydrated
    }),
    [mode, selectedFacilityId, facilityRole, facilityFeaturesEnabled, hydrated]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
