import React from "react";
export { useFacility } from "@/state/useFacility";

export function FacilityProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
