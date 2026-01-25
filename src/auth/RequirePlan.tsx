import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "./AuthContext";
import { logEvent } from "../api/events";

export default function RequirePlan({
  children,
  allow
}: {
  children: React.ReactNode;
  allow: string[];
}) {
  const { user } = useAuth();
  const router = useRouter();
  const hasAccess = user && allow.includes(user.plan);

  useEffect(() => {
    if (!hasAccess) {
      logEvent("PAYWALL_VIEW");
      router.replace("/(app)/upgrade");
    }
  }, [hasAccess, router]);

  if (!hasAccess) {
    return null;
  }
  return <>{children}</>;
}
