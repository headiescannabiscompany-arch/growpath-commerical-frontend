// Pure pass-through: just exposes user from AuthContext
import React, { createContext, useContext } from "react";
import { useAuth } from "./AuthContext";

const EntitlementsContext = createContext(null);

export function EntitlementsProvider({ children }) {
  const { user } = useAuth();
  return (
    <EntitlementsContext.Provider value={user}>{children}</EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  const ctx = useContext(EntitlementsContext);
  if (!ctx) throw new Error("useEntitlements must be used within EntitlementsProvider");
  return ctx;
}
