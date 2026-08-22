import CashFlowSnapshotTool from "@/features/businessDesk/CashFlowSnapshotTool";
import { useEntitlements } from "@/entitlements";
import FacilityBusinessDeskWorkspaceBoundary from "@/features/businessDesk/BusinessDeskWorkspaceBoundary";

export default function FacilityCashFlowSnapshotRoute() {
  const entitlements = useEntitlements();

  return (
    <FacilityBusinessDeskWorkspaceBoundary>
      {(workspace) => (
        <CashFlowSnapshotTool
          key={`${workspace.workspaceType}:${workspace.facilityId}:${entitlements.facilityRole}`}
          workspace={workspace}
          workspaceLabel="Facility"
          basePath="/home/facility/business-desk"
          canViewCurrentCash={entitlements.facilityRole === "OWNER"}
        />
      )}
    </FacilityBusinessDeskWorkspaceBoundary>
  );
}
