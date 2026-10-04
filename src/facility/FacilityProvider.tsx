import React from "react";

import { useEntitlements } from "@/entitlements";
import { useAccountMode } from "@/state/useAccountMode";

export { useFacility } from "@/state/useFacility";

export function FacilityProvider({ children }: { children: React.ReactNode }) {
  const entitlements = useEntitlements();
  const { setMode } = useAccountMode();

  React.useEffect(() => {
    if (!entitlements.ready) return;
    setMode(entitlements.mode);
  }, [entitlements.mode, entitlements.ready, setMode]);

  // The Facility route boundary owns restoration and its Retry/Select UI.
  // Do not preselect an entitlement alias here: it would bypass that boundary,
  // mount operational routes with the wrong ID, and race an explicit selection.

  return <>{children}</>;
}
