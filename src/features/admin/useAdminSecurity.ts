import { useSyncExternalStore } from "react";
import { getAdminSecurityEpoch, subscribeAdminSecurity } from "@/api/adminPasskeys";

export function useAdminSecurityEpoch() {
  return useSyncExternalStore(subscribeAdminSecurity, getAdminSecurityEpoch, () => 0);
}
