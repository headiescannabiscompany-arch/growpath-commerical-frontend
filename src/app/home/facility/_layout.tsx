import React, { useEffect, useMemo } from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import { useAccountMode } from "@/state/useAccountMode";
import { useFacility } from "@/state/useFacility";

export default function FacilityLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const { mode } = useAccountMode();
  const { selectedId } = useFacility();

  const redirectTarget = useMemo(() => {
    // Mode gate
    if (mode !== "facility") {
      return mode === "commercial" ? "/home/commercial" : "/home/personal";
    }

    // Facility selection gate (allow /select to render without selectedId)
    const isSelect =
      pathname === "/home/facility/select" || pathname === "/home/facility/select/";

    if (!selectedId && !isSelect) {
      return "/home/facility/select";
    }

    return null;
  }, [mode, pathname, selectedId]);

  useEffect(() => {
    if (!redirectTarget) return;
    router.replace(redirectTarget);
  }, [router, redirectTarget]);

  if (redirectTarget) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
