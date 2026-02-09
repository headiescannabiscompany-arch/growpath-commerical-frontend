import { useMemo, useState } from "react";

export type AccountMode = "personal" | "commercial" | "facility";

export type UseAccountMode = {
  mode: AccountMode;
  setMode: (m: AccountMode) => void;
  isPersonal: boolean;
  isCommercial: boolean;
  isFacility: boolean;
};

/**
 * Minimal web-safe stub to keep routing stable.
 * Later we can back this with Zustand/AsyncStorage + entitlements.
 */
export function useAccountMode(): UseAccountMode {
  const [mode, setMode] = useState<AccountMode>("commercial");

  return useMemo(
    () => ({
      mode,
      setMode,
      isPersonal: mode === "personal",
      isCommercial: mode === "commercial",
      isFacility: mode === "facility"
    }),
    [mode]
  );
}
