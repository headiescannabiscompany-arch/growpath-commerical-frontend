import React, { createContext, useContext, useState } from "react";

// Test-only context shape. Never imports real credentials or the AuthProvider.
type State = "signed_out" | "pending" | "ready";
type Identity = { state: State; account: 1 | 2; revision: number };
const Context = createContext<{
  identity: Identity;
  setIdentity: React.Dispatch<React.SetStateAction<Identity>>;
} | null>(null);
export function FixtureAuthProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<Identity>({
    state: "signed_out",
    account: 1,
    revision: 1
  });
  return (
    <Context.Provider value={{ identity, setIdentity }}>{children}</Context.Provider>
  );
}
export function useFixtureAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("Synthetic auth provider missing");
  return value;
}
export function useAuth() {
  const { identity } = useFixtureAuth();
  const signedOut = identity.state === "signed_out";
  return {
    token: signedOut ? null : `synthetic-host-${identity.account}-${identity.revision}`,
    user: signedOut
      ? null
      : {
          id: String(identity.account).repeat(24),
          emailVerified: true,
          role: "user",
          plan: "pro"
        },
    isAuthed: identity.state === "ready",
    isHydrating: false,
    meStatus: signedOut ? "idle" : identity.state === "ready" ? "ready" : "loading",
    plan: "pro",
    credits: 37
  };
}
