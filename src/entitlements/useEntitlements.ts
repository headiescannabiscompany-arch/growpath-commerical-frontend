import { useEntitlementsContext } from "./EntitlementsProvider";

export function useEntitlements() {
  return useEntitlementsContext();
}
