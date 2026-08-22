import BusinessDeskHub from "@/features/businessDesk/BusinessDeskHub";
import FacilityBusinessDeskWorkspaceBoundary from "@/features/businessDesk/BusinessDeskWorkspaceBoundary";

export default function FacilityBusinessDeskRoute() {
  return (
    <FacilityBusinessDeskWorkspaceBoundary>
      {() => (
        <BusinessDeskHub
          basePath="/home/facility/business-desk"
          workspaceLabel="Facility"
        />
      )}
    </FacilityBusinessDeskWorkspaceBoundary>
  );
}
