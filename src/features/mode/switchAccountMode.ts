export type AccountMode = "SINGLE_USER" | "COMMERCIAL" | "FACILITY";

export type SwitchModeDeps = {
  // current state
  currentMode: AccountMode;
  selectedFacilityId: string | null;
  brandId?: string | null;

  // setters (state stores)
  setMode: (mode: AccountMode) => void;
  setSelectedFacilityId?: (facilityId: string | null) => void;

  // navigation
  replace: (path: string) => void;
};

export function switchAccountMode(targetMode: AccountMode, deps: SwitchModeDeps) {
  const { selectedFacilityId, setMode, setSelectedFacilityId, replace } = deps;

  // 1) Mode update (single source of truth)
  setMode(targetMode);

  // 2) Context clearing rules
  if (targetMode !== "FACILITY" && typeof setSelectedFacilityId === "function") {
    setSelectedFacilityId(null);
  }

  // 3) Deterministic destination
  if (targetMode === "FACILITY") {
    replace(selectedFacilityId ? "/home/facility" : "/home/facility/select");
    return;
  }

  if (targetMode === "COMMERCIAL") {
    replace("/home/commercial");
    return;
  }

  replace("/home/personal");
}
