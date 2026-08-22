import QuoteEstimateTool from "@/features/businessDesk/QuoteEstimateTool";
import FacilityBusinessDeskWorkspaceBoundary from "@/features/businessDesk/BusinessDeskWorkspaceBoundary";

export default function FacilityQuoteEstimateRoute() {
  return (
    <FacilityBusinessDeskWorkspaceBoundary>
      {(workspace) => (
        <QuoteEstimateTool
          workspace={workspace}
          workspaceLabel="Facility"
          basePath="/home/facility/business-desk"
        />
      )}
    </FacilityBusinessDeskWorkspaceBoundary>
  );
}
