import LeadFollowUpTool from "@/features/businessDesk/LeadFollowUpTool";
import FacilityBusinessDeskWorkspaceBoundary from "@/features/businessDesk/BusinessDeskWorkspaceBoundary";

export default function FacilityLeadFollowUpRoute() {
  return (
    <FacilityBusinessDeskWorkspaceBoundary>
      {(workspace) => (
        <LeadFollowUpTool
          workspace={workspace}
          workspaceLabel="Facility"
          basePath="/home/facility/business-desk"
        />
      )}
    </FacilityBusinessDeskWorkspaceBoundary>
  );
}
