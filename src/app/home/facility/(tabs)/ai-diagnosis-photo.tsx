import React from "react";

import DiagnoseRoute from "@/app/home/personal/(tabs)/diagnose";
import { useFacility } from "@/state/useFacility";

export default function FacilityAiDiagnosisPhotoRoute() {
  const { selectedId: facilityId } = useFacility();
  return <DiagnoseRoute workspaceType="facility" facilityId={String(facilityId || "")} />;
}
