import React from "react";
import { useEntitlements } from "../entitlements";
import type { CapabilityKey } from "../entitlements/types";
import { LockedScreen } from "../entitlements/LockedScreen";

type Props = {
  children: React.ReactNode;
  capability: CapabilityKey | CapabilityKey[];
};

/** @deprecated Use RequireEntitlement with canonical capabilities. */
export default function RequirePlan({ children, capability }: Props) {
  const entitlements = useEntitlements();
  const required = Array.isArray(capability) ? capability : [capability];

  if (!entitlements.ready) return null;
  if (!required.every((key) => entitlements.can(key))) {
    return (
      <LockedScreen
        title="Locked"
        message="Your account does not have access to this feature."
      />
    );
  }
  return <>{children}</>;
}
