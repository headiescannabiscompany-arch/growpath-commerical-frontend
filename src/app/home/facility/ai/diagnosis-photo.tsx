import React from "react";
import { useLocalSearchParams } from "expo-router";

import { useFacility } from "@/state/useFacility";
import TrichomeAnalysisScreen from "@/screens/facility/TrichomeAnalysisScreen";

export default function FacilityAiDiagnosisPhotoRoute() {
  const { selectedId: facilityId } = useFacility();
  const params = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = Array.isArray(params.growId) ? params.growId[0] : params.growId;

  return (
    <TrichomeAnalysisScreen
      facilityId={String(facilityId || "")}
      growId={String(growId || "unknown-grow")}
    />
  );
}
