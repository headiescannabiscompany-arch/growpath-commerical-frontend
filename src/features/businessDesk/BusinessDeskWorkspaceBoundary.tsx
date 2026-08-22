import React from "react";
import { Text, View } from "react-native";

import {
  businessDeskWorkspaceKey,
  resolveFacilityBusinessDeskWorkspace,
  type FacilityBusinessDeskWorkspace
} from "@/api/businessDesk";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useFacility } from "@/state/useFacility";

type FacilityBusinessDeskWorkspaceBoundaryProps = {
  children: (workspace: FacilityBusinessDeskWorkspace) => React.ReactNode;
};

export default function FacilityBusinessDeskWorkspaceBoundary({
  children
}: FacilityBusinessDeskWorkspaceBoundaryProps) {
  const { selectedId, selected } = useFacility();
  const selectedRecordId = String(selected?.id || "").trim();
  const selectionIsCurrent =
    Boolean(selectedRecordId) && selectedRecordId === String(selectedId || "").trim();
  const workspace = selectionIsCurrent
    ? resolveFacilityBusinessDeskWorkspace(selectedId)
    : null;

  if (!workspace) {
    return (
      <AppPage
        routeKey="facility-business-desk-workspace-required"
        railOverride={null}
        backFallbackHref="/home/facility/select"
        header={
          <View>
            <Text accessibilityRole="header" aria-level={1}>
              Select a facility
            </Text>
          </View>
        }
      >
        <AppCard
          title="Facility workspace required"
          titleLevel={2}
          subtitle="Choose the Facility you are authorized to manage before opening its Business Desk. No Commercial workspace was used as a fallback."
        />
      </AppPage>
    );
  }

  return (
    <React.Fragment key={businessDeskWorkspaceKey(workspace)}>
      {children(workspace)}
    </React.Fragment>
  );
}
