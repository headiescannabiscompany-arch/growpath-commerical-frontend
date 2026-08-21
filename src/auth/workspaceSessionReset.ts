import AsyncStorage from "@react-native-async-storage/async-storage";

import { setPreferredMode } from "./modeStore";
import { resetAccountModeStore } from "../state/useAccountMode";
import { resetFacilityStore } from "../state/useFacility";

const LEGACY_WORKSPACE_KEYS = [
  "gp.session.mode",
  "gp.session.facilityId",
  "gp.session.facilityRole",
  "gp.session.facilityFeaturesEnabled"
];

/**
 * Clears account-scoped workspace choices before another identity can render.
 * Storage cleanup is best effort; in-memory isolation must always complete.
 */
export async function resetWorkspaceSessionState() {
  resetAccountModeStore();
  resetFacilityStore();

  await Promise.allSettled([
    setPreferredMode(null),
    ...LEGACY_WORKSPACE_KEYS.map((key) => AsyncStorage.removeItem(key))
  ]);
}
