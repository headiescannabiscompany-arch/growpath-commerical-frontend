import JobNotesTool from "@/features/businessDesk/JobNotesTool";
import FacilityBusinessDeskWorkspaceBoundary from "@/features/businessDesk/BusinessDeskWorkspaceBoundary";
import { useEntitlements } from "@/entitlements";

export default function FacilityJobNotesRoute() {
  const entitlements = useEntitlements();
  return (
    <FacilityBusinessDeskWorkspaceBoundary>
      {(workspace) => (
        <JobNotesTool
          key={`${workspace.workspaceType}:${workspace.facilityId}:${entitlements.facilityRole}`}
          workspace={workspace}
          workspaceLabel="Facility"
          basePath="/home/facility/business-desk"
          canConfigureTimeZone={entitlements.facilityRole === "OWNER"}
        />
      )}
    </FacilityBusinessDeskWorkspaceBoundary>
  );
}
