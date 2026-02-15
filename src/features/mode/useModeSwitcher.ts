import { useMemo } from "react";
import { useRouter } from "expo-router";

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

  const switchTo = useMemo(() => {
    return (next: AccountMode) =>
      switchAccountMode(next, { currentMode: mode, setMode, router });
  }, [mode, setMode, router]);

  return { mode, switchTo };
}
