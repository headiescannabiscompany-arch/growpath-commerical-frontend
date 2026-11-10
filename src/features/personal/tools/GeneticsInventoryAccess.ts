import { createContext, type ReactNode } from "react";

// Only the Personal tools layout can supply an allow decision.
export const GeneticsInventoryAccess = createContext<{
  canOpen: boolean;
  lockedNotice: ReactNode;
}>({ canOpen: false, lockedNotice: null });
