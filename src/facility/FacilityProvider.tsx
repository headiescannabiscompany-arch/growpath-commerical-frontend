$root="C:\growpath-commercial\frontend"; cd $root

@'
import React from "react";
export { useFacility } from "@/state/useFacility";

// Keep legacy provider in the tree, but make it a no-op so all reads/writes
// come from the single Zustand store.
export function FacilityProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
'@ | Set-Content -Encoding UTF8 .\src\facility\FacilityProvider.tsx
