import type { AccountMode } from "../../state/useAccountMode";

export type SwitchModeDeps = {
  currentMode: AccountMode;
  setMode: (mode: AccountMode) => void;
  router: { replace: (href: string) => void };
  setPreferredMode?: (mode: AccountMode) => void | Promise<void>;
};

/**
 * Deterministic mode switcher.
 * Mode strings follow entitlements/state: "personal" | "commercial" | "facility".
 */
export async function switchAccountMode(nextMode: AccountMode, deps: SwitchModeDeps) {
  const { currentMode, setMode, router } = deps;

  await deps.setPreferredMode?.(nextMode);
  if (nextMode !== currentMode) setMode(nextMode);

  const href =
    nextMode === "facility"
      ? "/home/facility"
      : nextMode === "commercial"
        ? "/home/commercial"
        : "/home/personal";

  router.replace(href);
}
