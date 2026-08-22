import VendorCompareTool from "@/features/businessDesk/VendorCompareTool";
import FacilityBusinessDeskWorkspaceBoundary from "@/features/businessDesk/BusinessDeskWorkspaceBoundary";

export default function FacilityVendorCompareRoute() {
  return (
    <FacilityBusinessDeskWorkspaceBoundary>
      {(workspace) => (
        <VendorCompareTool
          workspace={workspace}
          workspaceLabel="Facility"
          basePath="/home/facility/business-desk"
        />
      )}
    </FacilityBusinessDeskWorkspaceBoundary>
  );
}
