import React, { useMemo } from "react";
import { useRouter } from "expo-router";

import { useEntitlements } from "@/entitlements";
import SearchScreen from "@/screens/SearchScreen";

const COMMON_ROUTES: Record<string, string> = {
  Courses: "/courses",
  Storefront: "/store",
  Feed: "/feed",
  Calendar: "/home/schedule",
  CertificateVerification: "/courses",
  Subscription: "/offers"
};

export function searchHref(route: string, mode?: string) {
  if (COMMON_ROUTES[route]) return COMMON_ROUTES[route];
  if (route === "Tools") {
    return mode === "facility"
      ? "/home/facility/ai-tools"
      : mode === "commercial"
        ? "/home/commercial/tools"
        : "/home/personal/tools";
  }
  if (route === "Forum") {
    return mode === "commercial"
      ? "/home/commercial/community"
      : mode === "facility"
        ? "/forum"
        : "/home/personal/community";
  }
  if (route === "Plants") {
    return mode === "commercial"
      ? "/home/commercial/grows"
      : mode === "facility"
        ? "/home/facility/grows"
        : "/home/personal/grows";
  }
  return "/home";
}

export default function SearchRoute() {
  const router = useRouter();
  const { mode } = useEntitlements();
  const navigation = useMemo(
    () => ({ navigate: (route: string) => router.push(searchHref(route, mode) as any) }),
    [mode, router]
  );

  return <SearchScreen navigation={navigation} showBack />;
}
