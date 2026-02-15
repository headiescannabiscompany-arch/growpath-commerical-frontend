import React from "react";
import { RequireAuth as RequireAuthComponent } from "./RequireAuth";
type Props = { children: React.ReactNode };

export default function RequireAuthGate({ children }: Props) {
  return <RequireAuthComponent>{children}</RequireAuthComponent>;
}
