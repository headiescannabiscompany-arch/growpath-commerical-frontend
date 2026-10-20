import React, { createContext, useContext, useState } from "react";
export type Role = "creator" | "buyer" | "recipient";
type Bootstrap = {
  renewalMode?: boolean;
  courseId: string;
  controlKey: string;
  accounts: Record<Role, { userId: string; token: string }>;
};
export const bootstrap: Bootstrap = (globalThis as any).__giftFixture;
delete (globalThis as any).__giftFixture;
if (!bootstrap || location.hostname !== "127.0.0.1")
  throw Error("Local bootstrap required");
const Context = createContext<{ role: Role; setRole: (role: Role) => void } | null>(null);
export function FixtureAuthProvider({ children }: { children?: React.ReactNode }) {
  const saved = sessionStorage.getItem("fixture-role");
  const [role, update] = useState<Role>(
    saved && ["creator", "buyer", "recipient"].includes(saved)
      ? (saved as Role)
      : bootstrap.renewalMode
        ? "recipient"
        : "creator"
  );
  return (
    <Context.Provider
      value={{
        role,
        setRole: (next) => {
          sessionStorage.setItem("fixture-role", next);
          update(next);
        }
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useFixtureAuth() {
  const value = useContext(Context);
  if (!value) throw Error("Fixture identity missing");
  return value;
}
export function useAuth() {
  const { role } = useFixtureAuth(),
    account = bootstrap.accounts[role];
  return {
    token: account.token,
    user: { id: account.userId, role: "user", plan: "pro", emailVerified: true },
    isAuthed: true,
    isHydrating: false,
    meStatus: "ready",
    plan: "pro",
    credits: 37
  };
}
