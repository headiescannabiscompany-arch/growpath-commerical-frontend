import PriceMarginTool from "@/features/businessDesk/PriceMarginTool";
import FacilityBusinessDeskWorkspaceBoundary from "@/features/businessDesk/BusinessDeskWorkspaceBoundary";

export default function FacilityPriceMarginRoute() {
  return (
    <FacilityBusinessDeskWorkspaceBoundary>
      {(workspace) => (
        <PriceMarginTool
          workspace={workspace}
          workspaceLabel="Facility"
          basePath="/home/facility/business-desk"
        />
      )}
    </FacilityBusinessDeskWorkspaceBoundary>
  );
}
