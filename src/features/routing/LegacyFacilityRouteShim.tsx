import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAccountMode } from "@/state/useAccountMode";
import { useFacility } from "@/state/useFacility";
import {
  legacyFacilitySectionToRoute,
  type LegacyFacilitySection
} from "./legacyFacilityRedirect";

export function LegacyFacilityRouteShim({ section }: { section: LegacyFacilitySection }) {
  const router = useRouter();
  const { facilityId } = useLocalSearchParams<{ facilityId: string }>();
  const { mode } = useAccountMode();
  const { selectedId, setSelectedId } = useFacility() as any;

  React.useEffect(() => {
    if (mode !== "facility") {
      router.replace(mode === "commercial" ? "/home/commercial" : "/home/personal");
      return;
    }
    const fid = String(facilityId || "").trim();
    if (!fid) {
      router.replace("/home/facility/select");
      return;
    }
    if (typeof setSelectedId === "function" && selectedId !== fid) {
      setSelectedId(fid);
    }
    router.replace(legacyFacilitySectionToRoute(section));
  }, [mode, facilityId, selectedId, setSelectedId, router, section]);

  return null;
}
