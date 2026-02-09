import { useRouter } from "expo-router";
import { switchAccountMode, type AccountMode } from "./switchAccountMode";
import { useAccountMode } from "@/state/useAccountMode";
import { useFacility } from "@/state/useFacility";

export function useModeSwitcher() {
  const router = useRouter();

  const { mode, setMode } = useAccountMode();
  const { selectedId, setSelectedId } = useFacility() as any;

  function switchTo(target: AccountMode) {
    switchAccountMode(target, {
      currentMode: mode,
      selectedFacilityId: selectedId ?? null,
      setMode,
      setSelectedFacilityId:
        typeof setSelectedId === "function" ? setSelectedId : undefined,
      replace: router.replace
    });
  }

  return { mode, switchTo };
}
