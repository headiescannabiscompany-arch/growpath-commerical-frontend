import { useRouter } from "expo-router";
import { useEntitlementsContext } from "../../../src/entitlements/EntitlementsProvider";
import type { CapabilityKey } from "../../../src/entitlements/types";

export function useRequireCapability() {
  const router = useRouter();
  const ent = useEntitlementsContext();

  return (cap: CapabilityKey) => {
    if (ent.can(cap)) return true;
    router.push("/(modals)/paywall");
    return false;
  };
}
