import { useMemo } from "react";
import { useRouter } from "expo-router";

import { useEntitlements } from "@/entitlements";
import { useAccountMode } from "../../state/useAccountMode";
import type { AccountMode } from "../../state/useAccountMode";
import { switchAccountMode } from "./switchAccountMode";

export type UseModeSwitcherResult = {
  mode: AccountMode;
  switchTo: (mode: AccountMode) => void;
};

export function useModeSwitcher(): UseModeSwitcherResult {
  const router = useRouter();
  const { mode, setMode } = useAccountMode();
  const entitlements = useEntitlements();

  const switchTo = useMemo(() => {
    return (next: AccountMode) =>
      void switchAccountMode(next, {
        currentMode: mode,
        setMode,
        router,
        setPreferredMode: entitlements.setPreferredMode
      });
  }, [mode, setMode, router, entitlements.setPreferredMode]);

  return { mode, switchTo };
}
